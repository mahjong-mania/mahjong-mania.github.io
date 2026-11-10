#!/usr/bin/env python3
"""Quarantine legacy mutable four-player histories; preserve captured embeddings."""
import datetime as dt,gzip,hashlib,json,pathlib,shutil,os
root=pathlib.Path('/workspace/mahjong-training/four');quarantine=root/'legacy-history-traces';quarantine.mkdir(exist_ok=True);changes=[]
if (root/'runner.lock').exists():raise SystemExit('stop the four-player runner before migrating traces')
for p in sorted(root.glob('trace-*.json.gz')):
 raw=p.read_bytes();data=json.loads(gzip.decompress(raw));samples=data.get('samples',[])
 if not any('events' in s and not s.get('eventHistoryCapturedAtDecision') for s in samples):continue
 original=quarantine/p.name
 if original.exists() and original.read_bytes()!=raw:raise RuntimeError('quarantine collision: '+p.name)
 if not original.exists():shutil.copy2(p,original)
 for s in samples:
  if not s.get('eventHistoryCapturedAtDecision'):
   s.pop('events',None);s['eventHistoryCapturedAtDecision']=False;s['eventHistoryUnavailableReason']='Legacy history array was mutable after capture. Use only the captured phi/q/teacher fields for output-head training.'
 data['historyMigration']={'kind':'legacy-history-redaction','originalSHA256':hashlib.sha256(raw).hexdigest(),'originalPath':str(original),'decisionEmbeddingsPreserved':True}
 out=gzip.compress(json.dumps(data,separators=(',',':')).encode());tmp=p.with_suffix('.tmp');tmp.write_bytes(out);os.replace(tmp,p);changes.append({'file':p.name,'originalSHA256':hashlib.sha256(raw).hexdigest(),'sanitizedSHA256':hashlib.sha256(out).hexdigest(),'samples':len(samples)})
report={'at':dt.datetime.now(dt.timezone.utc).isoformat(),'files':len(changes),'samples':sum(c['samples'] for c in changes),'policyInferenceUnaffected':True,'headTrainingUnaffected':'The learner reads captured phi/q/teacher and terminal reward; it never consumed events.','changes':changes};target=root/'history-migration.json';tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(report,indent=2));os.replace(tmp,target);print(json.dumps({k:v for k,v in report.items() if k!='changes'}))
