#!/usr/bin/env python3
"""Loopback development server for real Mortal-backed browser CPU matches."""
import argparse,http.server,json,pathlib,threading,time,urllib.parse
from mortal_worker import infer
ROOT=pathlib.Path(__file__).resolve().parents[2]
ap=argparse.ArgumentParser();ap.add_argument('--port',type=int,default=8790);ap.add_argument('--experimental',action='store_true');ap.add_argument('--four-model',help='Local verification override for the four-player model');a=ap.parse_args()
lock=threading.Lock();stats={'requests':0,'inferences':0,'errors':0}
def policy(mode):
 folder=pathlib.Path('/workspace/mahjong-training')/mode;config=json.loads((ROOT/'scripts/cpu/experiment-config.json').read_text())['initial']
 final=folder/'final-evaluation.json'
 if final.exists():
  report=json.loads(final.read_text())
  if report.get('adoptable'):config=report['config']
 elif a.experimental and (folder/'state.json').exists():config=json.loads((folder/'state.json').read_text()).get('incumbent',config)
 if mode=='four' and a.four_model:config={**config,'modelPath':a.four_model}
 return config
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def send_json(self,status,data):
  body=json.dumps(data,allow_nan=False).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  route=urllib.parse.urlsplit(self.path).path
  if route=='/api/mortal/status':return self.send_json(200,stats)
  if route=='/mortal-config.js':
   enabled_modes={mode:a.experimental or ((pathlib.Path('/workspace/mahjong-training')/mode/'final-evaluation.json').exists() and json.loads((pathlib.Path('/workspace/mahjong-training')/mode/'final-evaluation.json').read_text()).get('adoptable',False)) for mode in ['four','sanma']}
   data={'endpoint':'/api/mortal' if any(enabled_modes.values()) else None,**{mode:{**{k:v for k,v in policy(mode).items() if k!='modelPath'},'enabled':enabled_modes[mode]} for mode in ['four','sanma']}}
   body=('globalThis.JewelMortalConfig='+json.dumps(data)+';').encode();self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();return self.wfile.write(body)
  return super().do_GET()
 def do_POST(self):
  if self.path!='/api/mortal':return self.send_json(404,{'error':'not found'})
  origin=self.headers.get('Origin')
  if origin and urllib.parse.urlsplit(origin).netloc!=self.headers.get('Host'):return self.send_json(403,{'error':'origin rejected'})
  size=int(self.headers.get('Content-Length',0))
  if not 0<size<=2000000:return self.send_json(413,{'error':'invalid request size'})
  try:
   req=json.loads(self.rfile.read(size));mode=req['mode']
   if mode not in ['four','sanma']:raise ValueError('unsupported mode')
   clean={'mode':mode,'seat':req['seat'],'events':req['events']}
   model=policy(mode).get('modelPath')
   if model:
    p=pathlib.Path(model).resolve()
    if not (p.is_relative_to('/workspace/mahjong-training') or p.is_relative_to('/workspace/mortal-runtime')):raise ValueError('untrusted model path')
    clean['modelPath']=str(p)
   with lock:
    stats['requests']+=1;result=infer(clean);stats['inferences']+=int(result['actualInference'])
   self.send_json(200,{'ok':True,**result})
  except Exception as e:
   stats['errors']+=1;self.send_json(422,{'ok':False,'error':str(e)})
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler)
print('Local Mortal test server: http://127.0.0.1:'+str(a.port),flush=True)
server.serve_forever()
