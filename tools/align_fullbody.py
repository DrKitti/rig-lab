"""Step 1: align full-body variants to the shared production master and check scale.

    python tools/align_fullbody.py shared <out_prefix> <variant.png> [<variant.png> ...]

The production master is docs/rig-spec/pose-arms-out-male.png. Each variant
(image_gen output, any size) is matched to the master on the head and torso
(SIFT + RANSAC, one similarity transform) and resampled onto the master's 671x1164 canvas, saved
as <out_prefix>-v1.png, -v2.png, ... in the order given. Then it reports what step 1's review
needs, next to the master's values:
  - soles: lowest opaque row; more than SOLE_LIMIT px off means the body came out scaled
    (image_gen redraws the whole image) even though the head lines up;
  - head: width and height of everything above the neck;
  - leg widths: the near leg at the knee, shin and boot rows ("-" where the legs touch),
    against the shared sizes in docs/rig-spec/proportions.json, flagged outside their range
    (the same ranges as tools/check_proportions.py). A thin-legged full body is caught here,
    before any pieces are made.
A preview (<out_prefix>-compare.png) shows the master and each variant side by side, with the
ground, knee and neck lines drawn in. Only numpy + Pillow + OpenCV (local); no network.
"""
import os
import sys

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

MATCH_BOX = (60, 40, 620, 890)  # head and torso, full-body px
NECK_Y = 490
SOLE_Y = 1119
KNEE_Y, SHIN_Y, BOOT_Y = 950, 1010, 1080
NEAR_HIP_X = 306
LEG_GAP_X = 366  # between the legs
SOLE_LIMIT = 15
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTERS = {'shared': 'docs/rig-spec/pose-arms-out-male.png'}
LEG_RANGE = {'knee': (-0.10, 0.25), 'shin': (-0.10, 0.25), 'boot': (-0.10, 0.20)}


def gray(a):
    al = a[..., 3:4] / 255.0
    return cv2.cvtColor((a[..., :3] * al + 128 * (1 - al)).astype(np.uint8), cv2.COLOR_RGB2GRAY)


def near_leg_width(op, y, dx=0):
    xs = np.nonzero(op[y])[0]
    if not len(xs):
        return None
    runs = [r for r in np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1) if len(r) > 10]
    if not runs:
        return None
    r = min(runs, key=lambda r: abs((r.min() + r.max()) / 2 - NEAR_HIP_X - dx))
    if r.min() < LEG_GAP_X + dx < r.max():
        return None  # the legs touch here: can't tell one from the other
    return int(np.ptp(r))


def measure(a, dx=0):
    op = a[..., 3] > 128
    head = op[:NECK_Y]
    ys, xs = np.nonzero(head)
    return {'soles': int(np.nonzero(op.any(1))[0].max()),
            'head': (int(np.ptp(xs)), int(NECK_Y - ys.min())),
            'knee': near_leg_width(op, KNEE_Y, dx), 'shin': near_leg_width(op, SHIN_Y, dx), 'boot': near_leg_width(op, BOOT_Y, dx)}


def align(raw, master, kp_m, des_m, sift, pad_x=0):
    H, W = master.shape[:2]
    s0 = W / raw.shape[1]
    small = cv2.resize(gray(raw), None, fx=s0, fy=s0, interpolation=cv2.INTER_AREA)
    kp, des = sift.detectAndCompute(small, None)
    if des is None or des_m is None:
        raise ValueError('No registration features: inspect the full-body reference')
    good = [a for a, b in cv2.BFMatcher().knnMatch(des, des_m, k=2) if a.distance < 0.75 * b.distance]
    src = np.float32([kp[a.queryIdx].pt for a in good]) / s0
    dst = np.float32([kp_m[a.trainIdx].pt for a in good])
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.0,
                                         maxIters=20000, confidence=0.999)
    if M is None or inl is None:
        raise ValueError('Full-body registration failed; no output accepted')
    M[0, 2] += pad_x
    pre = raw.copy()
    pre[..., :3] *= pre[..., 3:4] / 255.0
    wp = cv2.warpAffine(pre, M, (W + 2 * pad_x, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    al = wp[..., 3:4]
    with np.errstate(divide='ignore', invalid='ignore'):
        wp[..., :3] = np.where(al > 0, wp[..., :3] * 255.0 / al, 0)
    return np.clip(wp, 0, 255), int(inl.sum()), len(good)


def main():
    args = sys.argv[1:]
    pad_x = 0
    if '--pad-x' in args:
        at = args.index('--pad-x')
        pad_x = int(args[at + 1])
        if pad_x < 0:
            raise ValueError('--pad-x must be non-negative')
        del args[at:at + 2]
    profile, prefix, variants = args[0], args[1], args[2:]
    Path(prefix).parent.mkdir(parents=True, exist_ok=True)
    master_p = os.path.join(ROOT, MASTERS[profile])
    spec = json.load(open(os.path.join(ROOT, 'docs', 'rig-spec', 'proportions.json')))[profile]['sizes']
    std = {'knee': spec['leg knee'], 'shin': spec['leg shin'], 'boot': spec['leg boot']}
    master = np.asarray(Image.open(master_p).convert('RGBA')).astype(np.float32)
    H, W = master.shape[:2]
    x0, y0, x1, y1 = MATCH_BOX
    mask = np.zeros((H, W), np.uint8)
    mask[y0:y1, x0:x1] = 255
    mask &= ((master[..., 3] > 128) * 255).astype(np.uint8)
    sift = cv2.SIFT_create(nfeatures=6000)
    kp_m, des_m = sift.detectAndCompute(gray(master), mask)
    ref = measure(master)
    print(f'{"":10}{"soles":>7}{"head WxH":>12}{"knee":>6}{"shin":>6}{"boot":>6}')
    row = lambda n, m: print(f'{n:10}{m["soles"]:7}{str(m["head"][0]) + "x" + str(m["head"][1]):>12}'
                             f'{m["knee"] or "-":>6}{m["shin"] or "-":>6}{m["boot"] or "-":>6}', end='')
    row('master', ref)
    print()
    print(f'{"standard":10}{"":7}{"":>12}{std["knee"]:6}{std["shin"]:6}{std["boot"]:6}')
    padded_master = np.pad(master, ((0, 0), (pad_x, pad_x), (0, 0)))
    tiles = [padded_master]
    for i, path in enumerate(variants, 1):
        raw = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
        img, inl, good = align(raw, master, kp_m, des_m, sift, pad_x)
        Image.fromarray(img.round().astype(np.uint8)).save(f'{prefix}-v{i}.png')
        Path(f'{prefix}-v{i}.frame.json').write_text(json.dumps({
            'offset': [pad_x, 0], 'canvas': [W + 2 * pad_x, H]}, indent=2), encoding='utf8')
        m = measure(img, pad_x)
        row(f'v{i}', m)
        notes = [f'{inl}/{good} matches']
        for k, (lo, hi) in LEG_RANGE.items():
            if m[k] is not None and not lo <= m[k] / std[k] - 1 <= hi:
                notes.append(f'{k} {m[k] / std[k] - 1:+.0%} vs standard')
        if abs(m['soles'] - ref['soles']) > SOLE_LIMIT:
            notes.append(f'soles {m["soles"] - ref["soles"]:+d}px: body scaled, check joints')
        print('   ' + '; '.join(notes))
        tiles.append(img)
    W += 2 * pad_x
    out = Image.new('RGBA', ((W + 10) * len(tiles), H + 26), (40, 40, 48, 255))
    d = ImageDraw.Draw(out)
    for i, t in enumerate(tiles):
        x = i * (W + 10)
        out.alpha_composite(Image.fromarray(t.round().astype(np.uint8)), (x, 26))
        d.text((x + 6, 6), 'master' if i == 0 else f'v{i}', fill='white')
        for y, col in ((SOLE_Y, (255, 230, 0)), (KNEE_Y, (0, 200, 255)), (NECK_Y, (255, 120, 120))):
            d.line((x, 26 + y, x + W, 26 + y), fill=col)
    out.save(f'{prefix}-compare.png')
    print('preview:', f'{prefix}-compare.png')


if __name__ == '__main__':
    main()
