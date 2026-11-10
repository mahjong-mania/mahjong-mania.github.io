#!/usr/bin/env python3
"""Fetch the optional MIT C3 four-player checkpoint and trim training state."""
import argparse,hashlib,json,os,pathlib,urllib.request
ap=argparse.ArgumentParser();ap.add_argument('--runtime',default='/workspace/mortal-runtime');a=ap.parse_args();runtime=pathlib.Path(a.runtime);root=runtime/'c3';root.mkdir(parents=True,exist_ok=True)
url='https://github.com/Mateces/c3/releases/download/v1.0/model-c3-best.pth';sha='ce8ae0cc300c0d9f1833b76d5d73e7f423008338c8454c7a402543f5b6f913fe';p=root/'model-c3-best.pth'
if not p.exists():
 with urllib.request.urlopen(url,timeout=120) as r,p.with_suffix('.part').open('wb') as f:
  while b:=r.read(1024*1024):f.write(b)
 os.replace(p.with_suffix('.part'),p)
if hashlib.sha256(p.read_bytes()).hexdigest()!=sha:raise RuntimeError('released checkpoint hash mismatch')
for src,dst in [('https://raw.githubusercontent.com/Mateces/c3/main/LICENSE','LICENSE'),('https://raw.githubusercontent.com/Mateces/c3/main/README.md','README.md')]:
 if not (root/dst).exists():
  with urllib.request.urlopen(src,timeout=30) as r:(root/dst).write_bytes(r.read())
import torch
s=torch.load(p,map_location='cpu',weights_only=True);hp=s['hyperparams'];clean={'config':{'control':{'version':hp['version']},'resnet':{'conv_channels':hp['conv_channels'],'num_blocks':hp['num_blocks']}},'mortal':s['mortal'],'current_dqn':s['current_dqn']}
if not (root/'mortal.pth').exists():torch.save(clean,root/'mortal.pth')
source={'source':url,'path':str(p),'sha256':sha,'bytes':p.stat().st_size,'license':'MIT per release repository; runtime requires AGPL Mortal components','role':'four-player alternative; strength must be measured on custom rules'}
(root/'source.json').write_text(json.dumps(source,indent=2))
manifest_path=runtime/'assets.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else [];known={v['path'] for v in manifest}
for name in ['mortal.pth','LICENSE','README.md','source.json']:
 f=root/name
 if str(f) not in known:manifest.append({'source':url,'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size,'sourceCheckpointSHA256':sha,'transform':'mortal.pth retains config, mortal and current_dqn only'})
manifest_path.write_text(json.dumps(manifest,indent=2));print(json.dumps(source))
