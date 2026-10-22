"""Line up the four Canva run-cycle frames of the recruit (cut by the deck's sprites.py) on one canvas each,
heads at the same place, and save them 300 px tall; the saluting recruit becomes the standing pose.
python3 scripts/art/recruit.py RUN_DIR STANDING.png OUT_DIR"""
import sys
import numpy as np
from PIL import Image

run_dir, standing, out = sys.argv[1:4]
frames = [Image.open(f'{run_dir}/run_{i}.png').convert('RGBA') for i in range(4)]
def head_x(im):  # centre of the cap: top fifth of the figure
    a = np.asarray(im)[..., 3][: im.height // 5] > 128
    return np.nonzero(a)[1].mean()
hx = [head_x(f) for f in frames]
left = max(hx); right = max(f.width - h for f, h in zip(frames, hx)); H = max(f.height for f in frames)
for i, (f, h) in enumerate(zip(frames, hx)):
    c = Image.new('RGBA', (int(left + right), H), (0, 0, 0, 0))
    c.alpha_composite(f, (int(left - h), 0))  # tops line up: the head stays level, the feet do the work
    k = 300 / H
    c.resize((round(c.width * k), 300), Image.LANCZOS).save(f'{out}/recruit_run_{i}.webp', quality=92)
print('head at', round(left * 300 / H), 'of', round((left + right) * 300 / H))
s = Image.open(standing).convert('RGBA'); s = s.crop(s.getchannel('A').getbbox())
s.resize((round(s.width * 340 / s.height), 340), Image.LANCZOS).save(f'{out}/recruit_stand.webp', quality=92)
