"""Verified lightweight DQN overlays over immutable local Mortal backbones."""
import hashlib,json,pathlib
import torch
def file_sha(path):return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
def backbone_sha(state):
 h=hashlib.sha256()
 for name,tensor in sorted(state['mortal'].items()):
  t=tensor.detach().cpu().contiguous();h.update(name.encode()+b'\0');h.update(str(t.dtype).encode()+b'\0');h.update(json.dumps(list(t.shape)).encode()+b'\0');h.update(t.reshape(-1).view(torch.uint8).numpy().tobytes())
 return h.hexdigest()
def load_state(path,runtime):
 path=pathlib.Path(path);state=torch.load(path,map_location='cpu',weights_only=True)
 if 'baseModelPath' in state:
  base=pathlib.Path(state['baseModelPath']).resolve()
  if not base.is_relative_to(pathlib.Path(runtime).resolve()):raise ValueError('overlay base must be an immutable runtime asset')
  if file_sha(base)!=state['baseModelSHA256']:raise ValueError('overlay base checksum mismatch')
  parent=torch.load(base,map_location='cpu',weights_only=True)
  if 'mortal' not in parent:raise ValueError('nested model overlays are not supported')
  if state.get('config')!=parent['config']:raise ValueError('overlay architecture does not match base')
  parent['current_dqn']=state['current_dqn'];state=parent
 return state
