import pathlib,shutil,re
base=pathlib.Path('/dev/shm/mahjong-wasm-build');src=base/'compatible/Mortal/libriichi';dst=base/'source/libriichi-wasm'
for name in ['state','algo','tile.rs','hand.rs','chi_type.rs','macros.rs','rankings.rs','vec_ops.rs','array.rs','consts.rs']:
 p=dst/'src'/name
 if p.is_dir():shutil.rmtree(p)
 if (src/'src'/name).is_dir():shutil.copytree(src/'src'/name,p)
 else:shutil.copy(src/'src'/name,p)
shutil.copy(src/'src/mjai/event.rs',dst/'src/mjai/event.rs')
if (src/'data').exists():shutil.copytree(src/'data',dst/'data',dirs_exist_ok=True)
for p in (dst/'src').rglob('*.rs'):
 if p.name=='lib.rs':continue
 s=p.read_text()
 s=re.sub(r'^use (?:pyo3::|numpy::|crate::py_helper::).*?;\n','',s,flags=re.M)
 # Remove only explicit Python registration / NumPy wrapper functions.
 for token in ['pub(crate) fn register_module(',"fn encode_obs_py<'py>("]:
  while token in s:
   start=s.index(token);brace=s.index('{',start);depth=1;end=brace+1
   while depth:
    depth+=(s[end]=='{')-(s[end]=='}');end+=1
   s=s[:start]+s[end:]
 s=re.sub(r'#\[(?:pyclass|pymethods|pyfunction|pyo3|getter|new)(?:\([^\]]*\))?\]\s*','',s)
 p.write_text(s.replace("/// Returns `(obs, mask)`", "// Returns `(obs, mask)`"))
p=dst/'src/consts.rs';p.write_text(p.read_text()+'\npub const CANONICAL_ACTION_SPACE: usize = 47;\n')
p=dst/'Cargo.toml';s=p.read_text();s=s.split('\n[features]')[0];s+='\n[features]\ndefault = ["sanma"]\nsanma = []\nsp_reproduce_cpp_ver = []\n';p.write_text(s.replace("/// Returns `(obs, mask)`", "// Returns `(obs, mask)`"))
print('Prepared compatible sanma WASM source; Python wrappers removed, native logic retained')
