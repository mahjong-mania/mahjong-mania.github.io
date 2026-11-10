#!/usr/bin/env python3
import importlib.util,json,pathlib,subprocess,tempfile,time,unittest,os
SCRIPT=pathlib.Path(__file__).with_name('checkpoint.py')
spec=importlib.util.spec_from_file_location('checkpoint',SCRIPT);cp=importlib.util.module_from_spec(spec);spec.loader.exec_module(cp)
class Checkpoints(unittest.TestCase):
 def test_restore_and_corruption(self):
  with tempfile.TemporaryDirectory() as folder:
   root=pathlib.Path(folder);cp.DATA=root/'data';cp.DATA.mkdir();cp.BACKUP=root/'backup'
   (cp.DATA/'state.json').write_text('{"step":42,"seed":123}');(cp.DATA/'partial.tmp').write_text('uncommitted')
   saved=cp.save('test');cp.restore(saved['archive'],root/'restore')
   self.assertEqual(json.loads((root/'restore/training/state.json').read_text())['step'],42);self.assertFalse((root/'restore/training/partial.tmp').exists())
   manifest=json.loads((root/'restore/manifest.json').read_text())['files'];self.assertIn('runtime/mortal/mortal.pth',manifest);self.assertIn('runtime/mortal3p/mortal.pth',manifest)
   digest=manifest['training/state.json']['sha256'];(cp.BACKUP/'objects'/digest).write_text('corrupt')
   with self.assertRaises(ValueError):cp.restore(saved['archive'],root/'damaged')
 def test_independent_periodic_process(self):
  with tempfile.TemporaryDirectory() as folder:
   root=pathlib.Path(folder);data=root/'data';backup=root/'backup';data.mkdir();(data/'state.json').write_text('{"step":1}')
   env={**os.environ,'MAHJONG_TRAINING_DIR':str(data),'MAHJONG_CHECKPOINT_DIR':str(backup)}
   p=subprocess.Popen(['python',str(SCRIPT),'--interval','.4','--deadline',str(time.time()+2.5)],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   time.sleep(.9);tmp=data/'state.json.tmp';tmp.write_text('{"step":2}');tmp.replace(data/'state.json');out,err=p.communicate(timeout=15)
   self.assertEqual(p.returncode,0,err.decode());self.assertGreaterEqual(len((backup/'history.jsonl').read_text().splitlines()),2)
   latest=json.loads((backup/'latest.json').read_text());cp.restore(latest['archive'],root/'restore');self.assertEqual(json.loads((root/'restore/training/state.json').read_text())['step'],2)
if __name__=='__main__':unittest.main()
