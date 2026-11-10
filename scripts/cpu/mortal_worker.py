#!/usr/bin/env python3
"""Local JSONL Mortal inference worker. No hidden hands or remote API calls."""
import argparse, gc, hashlib, importlib, json, os, pathlib, sys, time, traceback
runtime=os.environ.get('MORTAL_RUNTIME','/workspace/mortal-runtime')
sys.path.insert(0,runtime)
import torch
import numpy as np
from model_state import load_state,backbone_sha
torch.set_num_threads(1)
engines={}
class ReplayEngine:
 def __init__(self,base):
  self.__dict__.update(base.__dict__);self.base=base;self.live=False;self.q=None
 def react_batch(self,obs,masks,invisible_obs):
  if self.live:
   r=self.base.react_batch(obs,masks,invisible_obs)
   self.q=[float(v) if np.isfinite(v) else None for v in r[1][0]]
   return r
  # Reconstruct state without neural inference for historical decisions.
  actions=[int(np.flatnonzero(m)[0]) for m in masks]
  return actions,[[0. if v else -float('inf') for v in m] for m in masks],[m.tolist() for m in masks],[True]*len(masks)
def load(mode,model_path=None):
 key=(mode,model_path)
 if key not in engines:
  name='mortal3p' if mode=='sanma' else 'mortal'
  m=importlib.import_module(name+'.model')
  weight_path=pathlib.Path(model_path) if model_path else pathlib.Path(runtime)/name/'mortal.pth'
  s=load_state(weight_path,runtime)
  cfg=s['config'];version=cfg['control']['version']
  brain=m.Brain(version=version,**cfg['resnet']).eval();brain.load_state_dict(s['mortal'])
  dqn=m.DQN(version=version).eval();dqn.load_state_dict(s['current_dqn'])
  base=m.MortalEngine(brain,dqn,False,version,enable_quick_eval=False,enable_rule_based_agari_guard=False)
  engine=ReplayEngine(base)
  engine.model_sha256=hashlib.sha256(weight_path.read_bytes()).hexdigest()
  engine.backbone_id=str(cfg['resnet']['conv_channels'])+'x'+str(cfg['resnet']['num_blocks'])
  engine.backbone_sha256=backbone_sha(s)
  def capture(_module,_inputs,output):
   if engine.live:engine.phi=output.detach().cpu().numpy()[0].tolist()
  brain.register_forward_hook(capture)
  engines[key]=(m,engine)
  if len(engines)>8:
   del engines[next(iter(engines))];gc.collect()
 return engines[key]
def infer(req):
 mode=req['mode'];m,engine=load(mode,req.get('modelPath'));bot=m.Bot(engine,int(req['seat']));events=req['events'];engine.q=None
 if not events or events[0]['type']!='start_kyoku':raise ValueError('a complete public round history is required')
 for i,event in enumerate(events):
  engine.live=i==len(events)-1
  raw=bot.react(json.dumps(event,separators=(',',':')))
 result={'phi':getattr(engine,'phi',None) if req.get('trace') else None,'reaction':json.loads(raw) if raw else None,'q':engine.q,'model':mode+'-mortal-v4:'+engine.model_sha256[:12],'modelSHA256':engine.model_sha256,'backboneId':engine.backbone_id,'backboneSHA256':engine.backbone_sha256,'actualInference':engine.q is not None}
 if raw and json.loads(raw)['type']=='reach':
  engine.live=True;engine.q=None
  nxt=bot.react(json.dumps({'type':'reach','actor':int(req['seat'])}))
  result['reachReaction']=json.loads(nxt) if nxt else None;result['reachQ']=engine.q
 return result
def main():
 global runtime
 ap=argparse.ArgumentParser();ap.add_argument('--runtime',default=runtime);args=ap.parse_args();runtime=args.runtime;sys.path.insert(0,runtime)
 print(json.dumps({'ready':True,'pid':os.getpid()}),flush=True)
 for line in sys.stdin:
  try:
   req=json.loads(line);start=time.monotonic();result=infer(req);result['elapsedMs']=(time.monotonic()-start)*1000
   print(json.dumps({'id':req.get('id'),'ok':True,**result},allow_nan=False),flush=True)
  except Exception as e:
   print(json.dumps({'id':locals().get('req',{}).get('id'),'ok':False,'error':str(e)}),flush=True)
if __name__=='__main__':main()
