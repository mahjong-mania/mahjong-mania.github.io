#!/usr/bin/env python3
"""Frozen Mortal backbone; train DQN output on public self-play embeddings.

Teacher distillation is mixed with clipped Monte Carlo chip returns and an
anchor to the initial model. This is experimental offline head training,
not a full rules-aware Mortal retraining pipeline.
"""
import argparse,fcntl,datetime as dt,gzip,hashlib,importlib,json,os,pathlib,random,sys,time
ap=argparse.ArgumentParser();ap.add_argument('mode',choices=['four','sanma']);ap.add_argument('--data',default='/workspace/mahjong-training');ap.add_argument('--runtime',default='/workspace/mortal-runtime');ap.add_argument('--epochs',type=int,default=12);ap.add_argument('--max-samples',type=int,default=20000);a=ap.parse_args()
sys.path.insert(0,a.runtime)
import torch
from torch.nn import functional as F
torch.set_num_threads(1);torch.manual_seed(6631)
name='mortal' if a.mode=='four' else 'mortal3p';module=importlib.import_module(name+'.model');root=pathlib.Path(a.data)/a.mode
root.mkdir(parents=True,exist_ok=True)
lock=(root/'training.lock').open('w')
try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:raise SystemExit('head training already running')
samples=[];sources=[];seen=0;reservoir=random.Random(6631)
def action(reply):
 cut=reply.get('dapai') or reply.get('discard')
 if not cut:return None
 if cut.endswith('*') or reply.get('riichi'):return 37
 s,n=cut[:2];n=({'0':5,'8':6,'9':4,'A':5,'B':5,'C':5}.get(n,int(n) if n.isdigit() else 5) if s=='z' else (5 if n in '0ABC' else int(n)))
 return {'m':0,'p':9,'s':18,'z':27}[s]+n-1
for p in sorted(root.glob('trace-*.json.gz')):
 if p.name.startswith('trace-final-'):continue
 try:
  with gzip.open(p,'rt') as f:r=json.load(f)
  reward=max(-4,min(4,(r['terminal']['rankChips']+r['terminal']['bonusChips'])/30))
  for s in r['samples']:
   phi=s.get('phi');q=s.get('q');teacher=action(s.get('teacher',{}));chosen=action(s['chosen'])
   if phi is None or not q or teacher is None or chosen is None:continue
   if teacher>=len(q) or chosen>=len(q) or q[teacher] is None or q[chosen] is None:continue
   sample=(phi,q,teacher,chosen,reward,r['seed']);seen+=1
   if len(samples)<a.max_samples:samples.append(sample)
   else:
    slot=reservoir.randrange(seen)
    if slot<a.max_samples:samples[slot]=sample
  sources.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 except (ValueError,KeyError,OSError):continue
if len(samples)<128:
 print(json.dumps({'trained':False,'samples':len(samples),'reason':'need at least 128 supported decision samples'}));raise SystemExit(0)
# Split by game seed, never random decision rows from the same game.
train=[s for s in samples if s[5]%5!=0];val=[s for s in samples if s[5]%5==0]
if len(val)<16:val=[]
state=torch.load(pathlib.Path(a.runtime)/name/'mortal.pth',map_location='cpu',weights_only=True)
net=module.DQN(version=state['config']['control']['version']);net.load_state_dict(state['current_dqn']);opt=torch.optim.AdamW(net.parameters(),lr=0.0001,weight_decay=.01)
def tensors(data):
 return (torch.tensor([s[0] for s in data],dtype=torch.float32),torch.tensor([[v if v is not None else 0 for v in s[1]] for s in data],dtype=torch.float32),torch.tensor([[v is not None for v in s[1]] for s in data],dtype=torch.bool),torch.tensor([s[2] for s in data]),torch.tensor([s[3] for s in data]),torch.tensor([s[4] for s in data],dtype=torch.float32))
x,q0,mask,teacher,chosen,reward=tensors(train)
best=None;best_loss=float('inf');history=[]
for epoch in range(a.epochs):
 net.train();order=torch.randperm(len(train));total=0
 for batch in order.split(128):
  q=net(x[batch],mask[batch]);bc=F.cross_entropy(q,teacher[batch]);anchor=(q.masked_fill(~mask[batch],0)-q0[batch]).square().sum()/mask[batch].sum();mc=F.smooth_l1_loss(q.gather(1,chosen[batch,None]).squeeze(1),reward[batch]);loss=bc+.03*anchor+.03*mc
  opt.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(net.parameters(),1);opt.step();total+=float(loss.detach())*len(batch)
 net.eval()
 with torch.inference_mode():
  if val:
   vx,vq,vm,vt,vc,vr=tensors(val);validation=float(F.cross_entropy(net(vx,vm),vt))
  else:validation=total/len(train)
 history.append({'epoch':epoch+1,'loss':total/len(train),'validationTeacherLoss':validation})
 if validation<best_loss:best_loss=validation;best={k:v.detach().clone() for k,v in net.state_dict().items()}
state['current_dqn']=best
stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ');out=root/'models';out.mkdir(exist_ok=True)
model=out/(stamp+'.pth');tmp=model.with_suffix('.tmp');torch.save(state,tmp)
with tmp.open('rb') as f:os.fsync(f.fileno())
os.replace(tmp,model)
checkpoint={'model':net.state_dict(),'optimizer':opt.state_dict(),'torchRng':torch.get_rng_state(),'epochs':a.epochs,'sampleCount':len(samples),'sourceHashes':sources}
tmp=out/'training-state.tmp';torch.save(checkpoint,tmp);os.replace(tmp,out/'training-state.pth')
report={'trained':True,'mode':a.mode,'modelPath':str(model),'sha256':hashlib.sha256(model.read_bytes()).hexdigest(),'samples':len(samples),'totalSupportedSamples':seen,'trainSamples':len(train),'validationSamples':len(val),'backboneFrozen':True,'baseModel':name+'-akagi-small-v4','history':history,'sourceFiles':sources,'finishedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'strengthImprovementProven':False}
tmp=out/'latest.json.tmp';tmp.write_text(json.dumps(report,indent=2));os.replace(tmp,out/'latest.json')
print(json.dumps(report))
