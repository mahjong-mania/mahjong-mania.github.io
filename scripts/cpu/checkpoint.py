#!/usr/bin/env python3
"""Independent 15-minute checkpoints, with atomic content-addressed storage."""
import argparse, datetime as dt, fcntl, hashlib, io, json, os, pathlib, signal, tarfile, time
ROOT=pathlib.Path(__file__).resolve().parents[2]
DATA=pathlib.Path(os.environ.get('MAHJONG_TRAINING_DIR','/workspace/mahjong-training'))
BACKUP=pathlib.Path(os.environ.get('MAHJONG_CHECKPOINT_DIR','/workspace/shared/mahjong-checkpoints'))
DEADLINE=dt.datetime.fromisoformat('2026-11-11T01:00:00+00:00').timestamp()
def atomic_json(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp')
 with tmp.open('w') as f:
  json.dump(data,f,ensure_ascii=False,indent=2);f.flush();os.fsync(f.fileno())
 os.replace(tmp,path)
def object_file(p):
 # Read once: even an append-only JSONL file is archived with a matching hash.
 data=p.read_bytes();sha=hashlib.sha256(data).hexdigest();target=BACKUP/'objects'/sha
 if not target.exists():
  tmp=target.with_suffix('.part')
  with tmp.open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
  os.replace(tmp,target)
 return {'sha256':sha,'bytes':len(data)}
def _save(reason='periodic'):
 BACKUP.mkdir(parents=True,exist_ok=True);(BACKUP/'objects').mkdir(exist_ok=True);DATA.mkdir(parents=True,exist_ok=True)
 stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');manifest={}
 for p in DATA.rglob('*'):
  if p.is_file() and not p.name.endswith(('.tmp','.lock','.part')):manifest['training/'+str(p.relative_to(DATA))]=object_file(p)
 runtime=pathlib.Path('/workspace/mortal-runtime')
 if (runtime/'assets.json').exists():
  for asset in json.loads((runtime/'assets.json').read_text()):
   p=pathlib.Path(asset['path'])
   if p.exists():manifest['runtime/'+str(p.relative_to(runtime))]=object_file(p)
  manifest['runtime/assets.json']=object_file(runtime/'assets.json')
 for rel in ['requirements.lock','fetch.py']:
  if (runtime/rel).exists():manifest['runtime/'+rel]=object_file(runtime/rel)
 target=BACKUP/(stamp+'.tar.gz');tmp=target.with_suffix('.part')
 with tarfile.open(tmp,'w:gz') as out:
  raw=json.dumps({'formatVersion':2,'files':manifest},ensure_ascii=False,indent=2).encode();info=tarfile.TarInfo('manifest.json');info.size=len(raw);out.addfile(info,io.BytesIO(raw))
  for rel in ['scripts/cpu','docs/cpu-improvement-run.md','engine.bundle.js','mortal-cpu.js','mortal-browser.js','mortal-config.js','ui.js','sanma.js','index.html','sanma.html','scripts/build-pwa.js','sw.js','.gitignore','package.json',*[str(p.relative_to(ROOT)) for p in ROOT.glob('*.html')]]:
   p=ROOT/rel
   if p.exists():out.add(p,arcname='source/'+rel,filter=lambda info:None if '__pycache__' in info.name or info.name.endswith('.pyc') else info)
 with tmp.open('rb') as f:os.fsync(f.fileno())
 os.replace(tmp,target)
 record={'formatVersion':2,'savedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'reason':reason,'archive':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'files':len(manifest),'modelWeights':'Base weights, native extensions, trained weights and optimizer states are saved once by SHA256 under objects/. Keep objects/ with the archives.'}
 atomic_json(BACKUP/'latest.json',record)
 with (BACKUP/'history.jsonl').open('a') as f:f.write(json.dumps(record)+'\n');f.flush();os.fsync(f.fileno())
 print(json.dumps(record),flush=True);return record
def save(reason='periodic'):
 BACKUP.mkdir(parents=True,exist_ok=True)
 with (BACKUP/'snapshot.lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  return _save(reason)
def restore(archive,destination):
 destination=pathlib.Path(destination)
 if destination.exists() and any(destination.iterdir()):raise ValueError('restore destination must be empty')
 destination.mkdir(parents=True,exist_ok=True)
 with tarfile.open(archive,'r:gz') as src:
  src.extractall(destination,filter='data')
 manifest=destination/'manifest.json'
 if manifest.exists():
  for rel,meta in json.loads(manifest.read_text())['files'].items():
   p=pathlib.Path(rel)
   if p.is_absolute() or '..' in p.parts:raise ValueError('invalid manifest path')
   data=(pathlib.Path(archive).parent/'objects'/meta['sha256']).read_bytes()
   if len(data)!=meta['bytes'] or hashlib.sha256(data).hexdigest()!=meta['sha256']:raise ValueError('checksum failed: '+rel)
   target=destination/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 print('Verified restore to '+str(destination))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--once',action='store_true');ap.add_argument('--interval',type=float,default=900);ap.add_argument('--deadline',type=float,default=DEADLINE);ap.add_argument('--restore');ap.add_argument('--to');a=ap.parse_args()
 if a.restore:
  if not a.to:ap.error('--restore requires --to')
  return restore(a.restore,a.to)
 if a.once:return save('manual')
 BACKUP.mkdir(parents=True,exist_ok=True);lock=(BACKUP/'watchdog.lock').open('w')
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise SystemExit('checkpoint watchdog already running')
 stop=False
 def halt(*_):
  nonlocal stop
  stop=True
 signal.signal(signal.SIGTERM,halt);signal.signal(signal.SIGINT,halt)
 atomic_json(BACKUP/'watchdog.json',{'pid':os.getpid(),'intervalSeconds':a.interval,'deadline':a.deadline})
 next_save=time.monotonic()
 while not stop and time.time()<a.deadline:
  if time.monotonic()>=next_save:
   try:save();next_save+=a.interval
   except Exception as e:print(json.dumps({'checkpointError':str(e),'at':dt.datetime.now(dt.timezone.utc).isoformat()}),flush=True);next_save=time.monotonic()+10
  time.sleep(min(10,max(0,a.deadline-time.time()),max(.01,next_save-time.monotonic())))
 save('deadline' if time.time()>=a.deadline else 'shutdown')
if __name__=='__main__':main()
