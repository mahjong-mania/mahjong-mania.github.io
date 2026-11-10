import argparse,hashlib,json,os,pathlib,urllib.request
ap=argparse.ArgumentParser();ap.add_argument('--runtime',default='/workspace/mortal-runtime');args=ap.parse_args();root=pathlib.Path(args.runtime);root.mkdir(parents=True,exist_ok=True)
sha='91cc2993e4e3682248d33d73d93afe055040e700'
base=f'https://raw.githubusercontent.com/shinkuan/Akagi/{sha}/'
files={'LICENSE.txt':'AKAGI-LICENSE.txt','README.md':'AKAGI-README.md'}
for name,lib in [('mortal','libriichi'),('mortal3p','libriichi3p')]:
 for file in ['model.py','logger.py','mortal.pth']:
  files[f'mjai_bot/{name}/{file}']=f'{name}/{file}'
 files[f'mjai_bot/{name}/libriichi/{lib}-3.12-x86_64-unknown-linux-gnu.so']=f'{name}/{lib}.so'
expected={'AKAGI-LICENSE.txt': '7921262d0dfb3178b94f4084d78608131ae54aba7c8f374e67f55862b0827c6b', 'AKAGI-README.md': '90b4d16904f728940695841a60c3eefeeeb7507d08edb9ea87f5299e41acfda7', 'mortal/model.py': '3677bf4a40a79d71e5d713c8dd31fd783af070e472fa2f03a4bade820ef21b73', 'mortal/logger.py': '23b4344a7e3565312e13694f0f77309f65f50621a42eb8a155a9ef6009ced2ec', 'mortal/mortal.pth': 'e94dc90bc3aaf412b0270d670660d7fe55c9d33b14419f97caf42fe77c01456f', 'mortal/libriichi.so': '3aeb09112198f6babe9bba4dd392ea009669ee7ba5d33cd3cd4242c737bb004b', 'mortal3p/model.py': '25dc6e88cd747c66dcff9088c1902560112f2c059327957b43fa35f10ce47436', 'mortal3p/logger.py': '6ee2f065b9ca0ae1ecf4c4bb0b52d9ae63a46bbee47c0770689fefe8ecb54b07', 'mortal3p/mortal.pth': '7b77cab4cd9782f48b0a8538b264840e5f5d20f9a8469914cdb52b7d0912f384', 'mortal3p/libriichi3p.so': '03900834051021f662fec35c6e9608f4d4c5aa61b4c4ce37b49fa2e861bf619b'}
manifest=[]
for src,dst in files.items():
 p=root/dst;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():
  tmp=p.with_suffix(p.suffix+'.part')
  with urllib.request.urlopen(base+src,timeout=120) as r,tmp.open('wb') as out:
   while chunk:=r.read(1024*1024):out.write(chunk)
  tmp.replace(p)
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 if digest!=expected[dst]:raise RuntimeError('Asset checksum mismatch: '+dst)
 manifest.append({'source':base+src,'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
 print(dst,p.stat().st_size,flush=True)
(root/'assets.json').write_text(json.dumps(manifest,indent=2))
