#!/usr/bin/env python3
"""Summarize measured study progress without treating training loss as strength."""
import datetime as dt,json,os,pathlib
root=pathlib.Path(os.environ.get('MAHJONG_TRAINING_DIR','/workspace/mahjong-training'))
report={'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'deadline':'2026-11-11T01:00:00Z','productionDeployed':False,'modes':{}}
for mode in ['four','sanma']:
 folder=root/mode
 if not (folder/'state.json').exists():continue
 state=json.loads((folder/'state.json').read_text());data={k:state.get(k) for k in ['studyVersion','phase','trial','pair','games','pairs','coverage','errors','startedAt','updatedAt','policySourceSha256','backboneFineTuned','headTrainingAvailable','failureCount']};data['live']=False
 if (folder/'runner.lock').exists():
  try:os.kill(json.loads((folder/'runner.lock').read_text())['pid'],0);data['live']=True
  except (ProcessLookupError,PermissionError,ValueError):pass
 for model_dir,field in [('models','headTraining'),('models-c3','largeHeadTraining')]:
  if (folder/model_dir/'latest.json').exists():
   head=json.loads((folder/model_dir/'latest.json').read_text());data[field]={k:head.get(k) for k in ['modelPath','sha256','samples','totalSupportedSamples','trainSamples','validationSamples','backboneFrozen','backbone','backboneSHA256','baseModelSHA256','overlay','skippedBackboneSamples','finishedAt','strengthImprovementProven']};data[field]['lastLoss']=head.get('history',[None])[-1]
 if (folder/'trials.jsonl').exists():
  trials=[json.loads(line) for line in (folder/'trials.jsonl').read_text().splitlines() if line.strip()];data['lastTrials']=trials[-3:]
 if (folder/'final-evaluation.json').exists():data['finalEvaluation']=json.loads((folder/'final-evaluation.json').read_text())
 data['strengthImprovementConfirmed']=bool(data.get('finalEvaluation',{}).get('adoptable'));report['modes'][mode]=data
cp=pathlib.Path('/workspace/shared/mahjong-checkpoints/latest.json')
if cp.exists():report['checkpoint']=json.loads(cp.read_text())
tmp=root/'report.json.tmp';tmp.write_text(json.dumps(report,indent=2,ensure_ascii=False));os.replace(tmp,root/'report.json')
print(json.dumps(report,indent=2,ensure_ascii=False))
