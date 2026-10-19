"""Report an outfit's sizes against the shared production body (pipeline step 4).

    python tools/check_proportions.py check <pieces.json> shared
    python tools/check_proportions.py save  <pieces.json> shared   # refresh reference sizes

Joints and lengths are fixed by the rig; this reports what the rig does not: head size, arm and
leg widths, fist and boot size. Values live in docs/rig-spec/proportions.json. All differences
are diagnostic only: an outfit passes or fails in the real renderer, not by these measurements.
The far arm is a separate opposite-view drawing and its ratios are printed without a required
target.

pieces.json is the pipeline's (assemble_pieces.py). An entry may give "png" (path from the
project root) instead of <pieces.json dir>/<piece>.png, and arms may give "fist" in piece px
instead of "fist_after" in full-body px.
"""

import json
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_rig_from_pieces import find_fist  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = os.path.join(ROOT, 'docs', 'rig-spec', 'proportions.json')
# (smallest, largest) relative to the master, per kind of size
RANGES = {'head': (-0.05, 0.05), 'fist': (-0.10, 0.10), 'boot': (-0.10, 0.20), 'limb': (-0.10, 0.25)}


def kind(key):
    if key.startswith('head'):
        return 'head'
    if key.endswith('fist'):
        return 'fist'
    if key == 'leg boot':
        return 'boot'
    return 'limb'
# Stations along the arm (fraction of shoulder → fist) and down the leg (units below the dome
# centre; the knee is at 169).
ARM = {'upper arm': 0.35, 'forearm': 0.65, 'wrist': 0.8, 'fist': 0.95}
FIST_SPAN = 0.25  # the fist is measured over the last 25% of the arm
LEG = {'thigh': 40, 'knee': 169, 'shin': 230, 'boot': 300}


def opaque(path):
    return np.asarray(Image.open(path).convert('RGBA'))[..., 3] > 128


def width_across(a, cx, cy, nx, ny):
    ts = [t for t in np.arange(-200, 200, 0.5)
          if 0 <= int(round(cy + ny * t)) < a.shape[0] and 0 <= int(round(cx + nx * t)) < a.shape[1]
          and a[int(round(cy + ny * t)), int(round(cx + nx * t))]]
    return round(max(ts) - min(ts)) if ts else 0


def measure(pieces_json):
    pieces = json.load(open(pieces_json, encoding='utf8'))
    base = os.path.dirname(os.path.abspath(pieces_json))
    png = lambda key: os.path.join(ROOT, pieces[key]['png']) if 'png' in pieces[key] else os.path.join(base, f'{key}.png')
    out = {}
    ys, xs = np.where(opaque(png('head')))
    out['head width'] = int(np.ptp(xs))
    out['head height'] = int(np.ptp(ys))
    for key, label in (('arm_F', 'near arm'), ('arm_B', 'far arm')):
        sx, sy = pieces[key]['pivot_shoulder']
        fx, fy = find_fist(png(key), (sx, sy))  # from the piece itself, whatever its pieces.json says
        length = math.hypot(fx - sx, fy - sy)
        ux, uy = (fx - sx) / length, (fy - sy) / length
        a = opaque(png(key))
        for name, f in ARM.items():
            if name != 'fist':
                out[f'{label} {name}'] = width_across(a, sx + ux * length * f, sy + uy * length * f, -uy, ux)
        # The fist: its widest cross-section over the arm's last FIST_SPAN (one line can miss it).
        ys, xs = np.nonzero(a)
        end = float(((xs - sx) * ux + (ys - sy) * uy).max())
        out[f'{label} fist'] = max(width_across(a, sx + ux * t, sy + uy * t, -uy, ux)
                                   for t in np.arange(end * (1 - FIST_SPAN), end, 2))
    a = opaque(png('leg_F'))
    dx, dy = pieces['leg_F']['pivot_dome']
    for name, below in LEG.items():
        out[f'leg {name}'] = width_across(a, dx, dy + below, 1, 0)
    return out


def main() -> None:
    mode, pieces_json, profile = sys.argv[1], sys.argv[2], sys.argv[3]
    sizes = measure(pieces_json)
    spec = json.load(open(SPEC, encoding='utf8')) if os.path.exists(SPEC) else {}
    if mode == 'save':
        # Preserve master identity metadata (rig and full body) when
        # refreshing measurements; only the measured source and sizes change here.
        entry = spec.get(profile, {})
        entry['source'] = os.path.relpath(pieces_json, ROOT).replace(os.sep, '/')
        entry['sizes'] = sizes
        spec[profile] = entry
        with open(SPEC, 'w', encoding='utf8') as f:
            f.write(json.dumps(spec, indent=2) + '\n')
        print(f'saved {profile} reference sizes:', sizes)
        return
    master = spec[profile]['sizes']
    # Every value is advice; existing working rigs define compatibility, not numeric perfection.
    warns = 0
    print(f'{"size":22}{"outfit":>8}{"master":>8}{"diff":>8}   range')
    for key, want in master.items():
        if key.startswith('far arm'):
            continue  # judged against the near arm below
        got = sizes[key]
        diff = (got - want) / want
        lo, hi = RANGES[kind(key)]
        ok = lo <= diff <= hi
        warns += not ok
        print(f'{key:22}{got:8}{want:8}{diff:+8.0%}   {lo:+.0%}..{hi:+.0%}  {"ok" if ok else "check by eye"}')
    print('far arm vs near arm (diagnostic only):')
    for st in ('upper arm', 'forearm', 'wrist', 'fist'):
        ratio = sizes[f'far arm {st}'] / sizes[f'near arm {st}']
        print(f'{"  " + st:22}{ratio:8.0%}')
    print(f'{warns} size(s) differ from the reference range; diagnostic only')

if __name__ == '__main__':
    main()
