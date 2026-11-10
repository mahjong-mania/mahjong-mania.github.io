#!/usr/bin/env python3
import pathlib,tempfile,unittest
import torch
from model_state import load_state,backbone_sha,file_sha
class ModelState(unittest.TestCase):
 def test_overlay_binding_and_frozen_backbone(self):
  with tempfile.TemporaryDirectory() as t:
   root=pathlib.Path(t);base=root/'base.pth';overlay=root/'head.pth';cfg={'control':{'version':4},'resnet':{'conv_channels':32,'num_blocks':2}};original={'config':cfg,'mortal':{'weight':torch.tensor([1.,2.])},'current_dqn':{'weight':torch.tensor([3.])}};torch.save(original,base);head={'baseModelPath':str(base),'baseModelSHA256':file_sha(base),'config':cfg,'current_dqn':{'weight':torch.tensor([4.])}};torch.save(head,overlay)
   result=load_state(overlay,root);self.assertEqual(backbone_sha(result),backbone_sha(original));self.assertEqual(float(result['current_dqn']['weight'][0]),4.)
   head['baseModelSHA256']='0'*64;torch.save(head,overlay)
   with self.assertRaisesRegex(ValueError,'checksum'):load_state(overlay,root)
 def test_untrusted_base_and_architecture(self):
  with tempfile.TemporaryDirectory() as t:
   root=pathlib.Path(t);runtime=root/'runtime';runtime.mkdir();base=root/'outside.pth';cfg={'control':{'version':4}};torch.save({'config':cfg,'mortal':{'x':torch.tensor([1])}},base);overlay=runtime/'head.pth';torch.save({'baseModelPath':str(base),'baseModelSHA256':file_sha(base),'config':cfg,'current_dqn':{}},overlay)
   with self.assertRaisesRegex(ValueError,'runtime asset'):load_state(overlay,runtime)
   inside=runtime/'base.pth';inside.write_bytes(base.read_bytes());torch.save({'baseModelPath':str(inside),'baseModelSHA256':file_sha(inside),'config':{'control':{'version':3}},'current_dqn':{}},overlay)
   with self.assertRaisesRegex(ValueError,'architecture'):load_state(overlay,runtime)
if __name__=='__main__':unittest.main()
