"""Diagnose candidate-v5 vs native-v4 observations; never supplies model input."""
import json,pathlib,numpy as np
root=pathlib.Path('/workspace/mahjong-browser-prototype')
a=json.loads((root/'fixtures.json').read_text());b=json.loads((root/'wasm-v5-probe.json').read_text());n=min(len(a),len(b))
x=np.array([f['obs'] for f in a[:n]],dtype=np.float32).transpose(1,0,2).reshape(775,-1)
y=np.array([f['obs'] for f in b[:n]],dtype=np.float32).reshape(n,780,34).transpose(1,0,2).reshape(780,-1)
cost=np.empty((775,780),dtype=np.int16)
for i in range(775):cost[i]=np.where(np.max(np.abs(y-x[i]),axis=1)<=1e-6,0,3)
dp=np.zeros((776,781),dtype=np.int32);dp[:,0]=np.arange(776)*2;dp[0,:]=np.arange(781)*2
for i in range(1,776):
 for j in range(1,781):dp[i,j]=min(dp[i-1,j-1]+cost[i-1,j-1],dp[i-1,j]+2,dp[i,j-1]+2)
i,j=775,780;alignment=[]
while i or j:
 if i and j and dp[i,j]==dp[i-1,j-1]+cost[i-1,j-1]:
  alignment.append({'native':i-1,'candidate':j-1,'equalInFixtures':bool(cost[i-1,j-1]==0),'maxError':float(np.max(np.abs(x[i-1]-y[j-1])))});i-=1;j-=1
 elif i and dp[i,j]==dp[i-1,j]+2:alignment.append({'native':i-1,'candidate':None});i-=1
 else:alignment.append({'native':None,'candidate':j-1});j-=1
alignment.reverse();maskdiff=[{'fixture':i,'indices':[j for j,(p,q) in enumerate(zip(a[i]['mask'],b[i]['mask'])) if bool(p)!=bool(q)]} for i in range(n)];maskdiff=[r for r in maskdiff if r['indices']]
report={'fixtures':n,'purpose':'diagnostic only; repeated zero rows make alignment ambiguous; not a conversion map','maskDifferences':maskdiff,'alignment':alignment,'unmatchedOrDifferent':[r for r in alignment if not r.get('equalInFixtures',False)]};(root/'encoder-channel-diagnosis.json').write_text(json.dumps(report,indent=2));print(json.dumps({'fixtures':n,'maskDifferenceFixtures':len(maskdiff),'unmatchedOrDifferent':report['unmatchedOrDifferent'][:30],'totalUnmatchedOrDifferent':len(report['unmatchedOrDifferent'])},indent=2))
