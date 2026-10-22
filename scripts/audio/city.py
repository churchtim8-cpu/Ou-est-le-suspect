"""Render the street's sound loops (synthesised, no recordings, no credits), with the town deck's recipes.
python3 scripts/audio/city.py OUT_DIR
  city_bed.mp3 : 20 s stereo bed: traffic rumble, a wash of distant streets, two crowds of chatter (left and right)
  engine_car.mp3, engine_bus.mp3 : 2 s mono engine + tyre loops, one per passing vehicle in the game
Every loop is cross-faded into itself and then written with an extra half second of its own start, so the
game can loop any window of exactly LOOP seconds (mp3 decoders add a little silence at the front)."""
import sys, subprocess, os
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, hi, order=2): return sosfilt(butter(order, hi, 'lowpass', fs=SR, output='sos'), x)
def hp(x, lo, order=2): return sosfilt(butter(order, lo, 'highpass', fs=SR, output='sos'), x)
def pink(n):
    f = np.fft.rfftfreq(n, 1 / SR); f[0] = 1
    s = (rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))) / np.sqrt(f)
    x = np.fft.irfft(s, n); return x / (np.std(x) + 1e-9)
def smooth(n, rate):
    k = max(2, int(n / SR * rate) + 2); pts = rng.standard_normal(k)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)

def chatter(n, voices=14):
    """a crowd: formant-filtered noise with syllable-rate envelopes and pauses between phrases"""
    out = np.zeros(n)
    for _ in range(voices):
        f = rng.uniform(350, 2200); x = bp(rng.standard_normal(n), f * 0.8, f * 1.25)
        syl = np.clip(smooth(n, rng.uniform(4, 7)), 0, None) ** 1.5
        talk = np.clip(smooth(n, 0.5) + 0.3, 0, 1)
        out += x * syl * talk * rng.uniform(0.4, 1.0)
    return out / (np.std(out) + 1e-9)

def engine(n, rpm, load=0.35, size=1.0):
    f = rpm / 30.0 / size * (1 + 0.01 * smooth(n, 2))
    ph = np.cumsum(2 * np.pi * f / SR); out = np.zeros(n)
    for k in range(1, 15):
        out += (1 / k ** 0.85) * (1.6 if k in (2, 4) else 1.0) * (1 + 0.35 * smooth(n, 9)) * np.sin(k * ph + rng.uniform(0, 6.28))
    for k in (0.5, 1.5, 2.5): out += 0.35 * np.sin(k * ph + rng.uniform(0, 6.28)) * (1 + 0.3 * smooth(n, 5))
    pulse = ((1 + np.cos(ph)) / 2) ** 8
    out = out * (0.55 + 0.65 * load) + pulse * lp(rng.standard_normal(n), 2500) * (0.6 + 1.6 * load) * 0.9
    out = lp(out, 600 / size) * (1 - load * 0.6) + lp(out, 2600 / size) * (0.25 + load * 0.6)
    out = hp(out, 28); out /= np.percentile(np.abs(out), 99.5) + 1e-9
    tyre = bp(pink(n), 180, 1800) + 0.4 * bp(rng.standard_normal(n), 2000, 5000)
    return out * 0.8 + tyre / (np.std(tyre) + 1e-9) * 0.35

def looped(x, loop, fade=1.0):
    """x has loop+fade seconds; returns loop seconds that join end-to-start, plus 0.5 s of its own start"""
    L, F = int(loop * SR), int(fade * SR)
    y = x[:L].copy(); w = np.linspace(0, 1, F)
    if x.ndim == 2: w = w[:, None]
    y[:F] = y[:F] * w + x[L:L + F] * (1 - w)
    return np.concatenate([y, y[: SR // 2]])

def write(x, path, kbps):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    wav = path + '.wav'; wavfile.write(wav, SR, (x * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', path], check=True)
    os.remove(wav); print(path, os.path.getsize(path) // 1024, 'KB')

out = sys.argv[1]
BED = 20.0
n = int((BED + 1) * SR)
db = lambda v: 10 ** (v / 20)
rumble = lp(pink(n), 300) * (1 + 0.25 * smooth(n, 0.15))
wash = bp(pink(n), 250, 3500) * (1 + 0.3 * smooth(n, 0.2))
# distant cars swelling by on other streets
swells = np.zeros(n)
for _ in range(9):
    c = rng.uniform(0, BED + 1); w = rng.uniform(1.5, 3.0); t = np.arange(n) / SR
    swells += np.exp(-((t - c) / w) ** 2) * rng.uniform(0.5, 1)
far = bp(pink(n), 150, 1200) * swells
crowdL, crowdR = chatter(n), chatter(n)
L = rumble * db(-22) + wash * db(-30) + far * db(-24) + crowdL * db(-27) + crowdR * db(-36)
R = rumble * db(-22) + wash * db(-30) + far * db(-26) + crowdR * db(-27) + crowdL * db(-36)
write(looped(np.stack([L, R], 1), BED), f'{out}/city_bed.mp3', 96)
for name, rpm, size in (('engine_car', 1700, 1.0), ('engine_bus', 1150, 1.6)):
    m = int(3.0 * SR)
    write(looped(engine(m, rpm, size=size), 2.0), f'{out}/{name}.mp3', 64)
