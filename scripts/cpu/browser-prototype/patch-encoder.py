"""Apply individually verified native-Akagi normalization fixes to candidate source.
This does not certify full encoder compatibility or change its channel count.
"""
import pathlib,sys
p=pathlib.Path(sys.argv[1])/'src/state/obs_repr.rs';s=p.read_text()
for old,new in [('score.clamp(0, 100_000) as f32 / 100_000.','score.clamp(0, 105_000) as f32 / 105_000.'),('score.clamp(0, 30_000) as f32 / 30_000.','score.clamp(0, 40_000) as f32 / 40_000.')]:
 if old not in s:raise ValueError('Unexpected source; refused patch: '+old)
 s=s.replace(old,new)
p.write_text(s)
