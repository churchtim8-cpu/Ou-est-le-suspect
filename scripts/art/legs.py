"""Give each single walking sprite a real walk cycle. The drawn legs are taken away (shoes kept as little
pictures), and new legs are drawn for every frame: thigh and shin with a bending knee, worked out from where
each foot is in the step (planted and sliding back, then lifting and swinging forward), in the sprite's own
trouser (or skin) colour with a dark outline. FRAMES frames per step cycle, saved HEIGHT px tall.
python3 scripts/art/legs.py SRC_DIR OUT_DIR [--check FILE]  -> OUT_DIR/<name>_<k>.webp"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

# Picture pixels (sprites are 300 px tall). cut = first row of the old legs; hip = where the new legs start
# (hidden under the jacket, skirt or shorts); keep = boxes under the cut that stay (bags, hands, a tail);
# raw keep boxes stay whole even where they look like trousers (a cane, a tail);
# lw = leg width (default: measured); shoes = boxes for the two shoes when one is off the ground;
# run = higher, quicker strides.
P = {
    'walk_0': dict(cut=186, hip=(68, 186), keep=[(0, 192, 72, 264), (86, 168, 114, 202)]),
    'walk_1': dict(cut=188, hip=(80, 186), keep=[(0, 178, 72, 268), (95, 176, 120, 196)]),
    'walk_2': dict(cut=232, hip=(72, 212), keep=[], lw=15),
    'walk_3': dict(cut=194, hip=(62, 192), keep=[], raw=[(106, 150, 128, 300)], lw=20),
    'walk_4': dict(cut=253, hip=(66, 214), keep=[]),
    'walk_5': dict(cut=182, hip=(66, 182), keep=[]),
    'walk_6': dict(cut=182, hip=(68, 182), keep=[]),
    'walk_7': dict(cut=271, hip=(60, 222), keep=[]),
    'suspect_0': dict(cut=180, hip=(75, 180), keep=[(110, 160, 145, 205)], lw=21),
    'suspect_1': dict(cut=174, hip=(100, 174), keep=[], run=True, shoes=[(0, 160, 36, 208), (140, 262, 200, 300)]),
    'pie_walk': dict(cut=196, hip=(102, 196), keep=[], raw=[(0, 186, 72, 238)], lw=22),
}
FRAMES, HEIGHT, SS = 8, 160, 4   # SS = drawn this many times bigger, then shrunk (smooth edges)
SHOE_ROWS = 24

def leg_colour(im, mask):
    px = im[mask & (im[..., 3] > 200)][:, :3].astype(float)
    bright = px.max(1) - px.min(1)
    px = px[(px.min(1) < 225) | (bright > 30)]            # not the white outline
    return tuple(int(v) for v in np.median(px, 0))

def shoe(im, mask):
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    a = im.copy(); a[..., 3] = np.where(mask, a[..., 3], 0)
    pic = Image.fromarray(a).crop((x0, y0, x1, y1))
    cols = np.nonzero(mask[y0])[0]                          # the ankle: middle of the shoe's top edge
    return pic, (cols.mean() - x0, 2), (cols.mean(), y0 + 2)

def two_bone(hip, ankle, l1, l2):
    """knee for a leg from hip to ankle, bending forward (towards +x)"""
    hx, hy = hip; ax, ay = ankle
    d = min(np.hypot(ax - hx, ay - hy), (l1 + l2) * 0.999)
    a = np.arctan2(ay - hy, ax - hx)
    k = np.arccos(np.clip((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
    return hx + l1 * np.cos(a - k), hy + l1 * np.sin(a - k)

src, out = sys.argv[1], sys.argv[2]
check = sys.argv[sys.argv.index('--check') + 1] if '--check' in sys.argv else None
sheets = []
for name, p in P.items():
    im = np.asarray(Image.open(f'{src}/{name}.webp').convert('RGBA')).copy()
    h, w = im.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    solid = im[..., 3] > 30
    below = (yy >= p['cut']) & solid
    raw = np.zeros_like(below)
    for (x0, y0, x1, y1) in p.get('raw', []): raw |= (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    keepbox = np.zeros_like(below)
    for (x0, y0, x1, y1) in p['keep']: keepbox |= (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    bottom = np.nonzero(solid.any(1))[0].max()
    shoes = below & (yy > bottom - SHOE_ROWS) & ~raw & ~keepbox
    if 'shoes' in p:  # a kicked-up foot is not in the bottom rows
        shoes = np.zeros_like(below)
        for (x0, y0, x1, y1) in p['shoes']: shoes |= below & (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    oldleg = below & ~raw & ~shoes
    colour = leg_colour(im, oldleg & ~keepbox & (yy < bottom - SHOE_ROWS))
    near = np.sqrt(((im[..., :3].astype(float) - colour) ** 2).sum(2)) < 34
    white = im[..., :3].min(2) > 200
    oldleg &= ~(keepbox & ~near & ~(white & ndimage.binary_dilation(oldleg & ~keepbox, iterations=3)))  # in a keep box only trouser-coloured bits (and their outline) go
    # shoes: the two lumps in the bottom rows, back one first
    lab, n = ndimage.label(ndimage.binary_dilation(shoes, iterations=1))
    sizes = ndimage.sum(shoes, lab, range(1, n + 1))
    lumps = sorted(np.argsort(sizes)[-2:] + 1, key=lambda i: xx[lab == i].mean())
    (back_pic, back_pin, back_ankle), (front_pic, front_pin, front_ankle) = [shoe(im, (lab == i) & shoes) for i in lumps]
    body_a = im.copy(); body_a[..., 3] = np.where(oldleg | shoes, 0, body_a[..., 3])
    body = Image.fromarray(body_a)
    # the step: stride from the drawn feet; legs long enough to reach them with a slight bend
    hip = np.array(p['hip'], float)
    run = p.get('run', False)
    half = (front_ankle[0] - back_ankle[0]) / 2 * (0.75 if run else 1.0)
    mid = (front_ankle[0] + back_ankle[0]) / 2
    ground = max(front_ankle[1], back_ankle[1])
    if run: mid, half = front_ankle[0] - half * 0.8, half  # the back foot is in the air: centre the stride under the hip
    reach = np.hypot(half * (1.0 if run else 1.05), ground - hip[1])
    l1 = l2 = reach / 2 * 1.04
    lift = h * (0.11 if run else 0.05)
    stance = 0.42 if run else 0.6
    lw = p.get('lw') or (max(9, (oldleg & (yy == p['cut'] + 12)).sum() / 2.2) if not run else 15)
    dark = tuple(int(c * 0.82) for c in colour)
    line = tuple(int(c * 0.3) for c in colour)
    def ankle_at(u):
        u %= 1
        if u < stance:
            return mid + half - 2 * half * u / stance, ground, 0.0
        v = (u - stance) / (1 - stance)
        return mid - half + 2 * half * (0.5 - 0.5 * np.cos(np.pi * v)), ground - lift * np.sin(np.pi * v), -18 * np.sin(np.pi * v)
    pad = int(abs(half) * 0.4) + 6
    W = w + 2 * pad
    frames = []
    for k in range(FRAMES):
        u = k / FRAMES
        c = Image.new('RGBA', (W * SS, h * SS), (0, 0, 0, 0))
        for leg_u, fill, pic, pin in ((u + 0.5, dark, back_pic, back_pin), (u, colour, front_pic, front_pin)):
            ax, ay, tilt = ankle_at(leg_u)
            hx, hy = hip[0] + (-2 if fill is dark else 2), hip[1]
            kx, ky = two_bone((hx, hy), (ax, ay), l1, l2)
            pts = [((x + pad) * SS, y * SS) for x, y in ((hx, hy), (kx, ky), (ax, ay))]
            d = ImageDraw.Draw(c)
            for width, col in ((lw + 3, line), (lw, fill)):
                d.line(pts, fill=col + (255,), width=int(width * SS), joint='curve')
                for (px, py) in pts[1:]:
                    r = width * SS / 2; d.ellipse((px - r, py - r, px + r, py + r), fill=col + (255,))
            # the shoe, tilted a little while the foot swings
            sp = pic.resize((pic.width * SS, pic.height * SS), Image.LANCZOS).rotate(tilt, center=(pin[0] * SS, pin[1] * SS), resample=Image.BICUBIC, expand=False)
            c.alpha_composite(sp, (int((ax + pad - pin[0]) * SS), int((ay - pin[1]) * SS)))
        big = body.resize((w * SS, h * SS), Image.LANCZOS)
        c.alpha_composite(big, (pad * SS, 0))
        frames.append(c.resize((W, h), Image.LANCZOS))
    k_ = HEIGHT / h
    for n, c in enumerate(frames):
        c.resize((round(W * k_), HEIGHT), Image.LANCZOS).save(f'{out}/{name}_{n}.webp', quality=86, alpha_quality=90)
    sheets.extend(frames)
    print(name, 'colour', colour, 'leg width', round(lw), 'frame', round(W * k_), 'x', HEIGHT)
if check:
    S = Image.new('RGBA', (sum(s.width for s in sheets) + 6 * len(sheets), 300), (225, 215, 190, 255)); x = 0
    for s in sheets: S.alpha_composite(s, (x, 0)); x += s.width + 6
    S.save(check)
