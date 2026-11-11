import sys,json,pathlib,gzip,hashlib,argparse
ap=argparse.ArgumentParser();ap.add_argument("--games",type=int,default=3);ap.add_argument("--decisions",type=int,default=2);args=ap.parse_args()
sys.path[:0]=['/workspace/mortal-runtime','/workspace/mahjong-mania/scripts/cpu']
import torch
from mortal3p.model import Brain,DQN
from mortal_worker import load,infer
out=pathlib.Path('/workspace/mahjong-browser-prototype');out.mkdir(exist_ok=True)
p=pathlib.Path('/workspace/mahjong-training/sanma/models/20261110T235031454280Z.pth');s=torch.load(p,weights_only=True,map_location='cpu');torch.set_num_threads(1)
assert s['config']['control']['version']==4 and s['config']['resnet']=={'conv_channels':32,'num_blocks':2}, 'Only tested 32x2 v4 architecture is supported'
b=Brain(version=4,**s['config']['resnet']).eval();b.load_state_dict(s['mortal']);d=DQN(version=4).eval();d.load_state_dict(s['current_dqn'])
weights=bytearray()
def tensor(t):
 a=t.detach().cpu().float().contiguous().numpy();r={'offset':len(weights)//4,'shape':list(a.shape)};weights.extend(a.tobytes());return r
def graph(m):
 t=type(m).__name__;r={'type':t}
 if t in ['Brain','ResNet','Sequential','ResBlock','ChannelAttention','DQN']:r['children']={k:graph(v) for k,v in m.named_children()}
 elif t in ['Conv1d','Linear','BatchNorm1d']:
  for k in ['weight','bias','running_mean','running_var']:
   v=getattr(m,k,None)
   if v is not None:r[k]=tensor(v)
  if t=='BatchNorm1d':r['eps']=m.eps
 elif t not in ['Mish','ReLU','Flatten','Identity']:raise ValueError(t)
 return r
model={'brain':graph(b),'dqn':graph(d),'sourceSHA256':hashlib.sha256(p.read_bytes()).hexdigest()};(out/'model.json').write_text(json.dumps(model));(out/'weights.bin').write_bytes(weights)
_,engine=load('sanma',str(p));fixtures=[]
def capture(_m,args):
 obs,mask=args
 with torch.no_grad():q=d(b(obs),mask)[0].tolist()
 fixtures.append({'seat':active['seat'],'events':active['events']+([{'type':'reach','actor':active['seat']}] if active['calls'] else []),'obs':obs[0].tolist(),'mask':mask[0].tolist(),'q':[v if v!=float('-inf') else None for v in q]});active['calls']+=1
# Capture actual native observations at the backbone input; obtain masks from its engine call.
original=engine.base.react_batch
def wrapped(obs,masks,invisible):
 capture(None,(torch.tensor(__import__('numpy').array(obs)),torch.tensor(__import__('numpy').array(masks))))
 return original(obs,masks,invisible)
engine.base.react_batch=wrapped
for f in sorted(pathlib.Path('/workspace/mahjong-training/sanma').glob('trace-final-*.json.gz'))[:args.games]:
 with gzip.open(f,'rt') as z:r=json.load(z)
 for sample in r['samples'][:args.decisions]:
  active={'seat':sample['seat'],'events':sample['events'],'calls':0}
  infer({'mode':'sanma','seat':sample['seat'],'events':sample['events'],'modelPath':str(p)})
(out/'fixtures.json').write_text(json.dumps(fixtures));print({'weightsBytes':len(weights),'fixtures':len(fixtures)})
