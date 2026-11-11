import sys,json,copy,pathlib
sys.path[:0]=['/workspace/mortal-runtime','/workspace/mahjong-mania/scripts/cpu']
from mortal_worker import load,infer
root=pathlib.Path('/workspace/mahjong-browser-prototype');f=json.loads((root/'fixtures.json').read_text())[0];_,e=load('sanma');original=e.base.react_batch;rows=[]
def capture(obs,masks,invisible):
 rows.append({'events':copy.deepcopy(events),'seat':f['seat'],'prefix':obs[0][:24].tolist()});return original(obs,masks,invisible)
e.base.react_batch=capture
for score in [-1000,0,1000,30000,35000,40000,100000,105000,150000]:
 events=copy.deepcopy(f['events']);events[0]['scores']=[score,35000,45000,0];infer({'mode':'sanma','seat':f['seat'],'events':events})
(root/'score-fixtures.json').write_text(json.dumps(rows));print(len(rows),'score fixtures')
