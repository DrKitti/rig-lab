"""Lock the user-selected far-arm anchor and restore Neutral's actual drawn angles.

Preserves the saved Time Travel artwork exactly; never edits texture pixels.
One-time migration with backups and pixel-registration evidence.
"""
from __future__ import annotations
import copy
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from promote_shared_c import artwork, matrix, worlds

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/drafts/shared-arm-placement-v2'
SPEC = ROOT / 'docs/rig-spec/shared-arm-placement.json'
VERSION = 'neutral-c-v2'


def recover_drawn_angle(raw, upright):
    """Read-only registration of the existing PNGs, not a newly guessed arm axis."""
    a, b = cv2.imread(str(raw), cv2.IMREAD_UNCHANGED), cv2.imread(str(upright), cv2.IMREAD_UNCHANGED)
    sift = cv2.SIFT_create()
    ka, da = sift.detectAndCompute(cv2.cvtColor(a[:, :, :3], cv2.COLOR_BGR2GRAY), a[:, :, 3])
    kb, db = sift.detectAndCompute(cv2.cvtColor(b[:, :, :3], cv2.COLOR_BGR2GRAY), b[:, :, 3])
    matches = [x for x, y in cv2.BFMatcher().knnMatch(da, db, k=2) if x.distance < .75 * y.distance]
    pa = np.float32([ka[x.queryIdx].pt for x in matches])
    pb = np.float32([kb[x.trainIdx].pt for x in matches])
    m, valid = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=2)
    assert m is not None and valid.sum() >= 8
    error = np.linalg.norm(np.column_stack([pa, np.ones(len(pa))]) @ m.T - pb, axis=1)[valid[:, 0] > 0]
    assert np.median(error) < 1
    return -math.degrees(math.atan2(m[1, 0], m[0, 0])), {
        'matches': len(matches), 'inliers': int(valid.sum()), 'median_error_px': float(np.median(error)),
        'raw_to_upright': m.tolist(), 'raw': str(raw.relative_to(ROOT)), 'upright': str(upright.relative_to(ROOT)),
    }


def bind_to_world(part, bone_world, desired):
    local = np.linalg.inv(bone_world) @ desired
    part.update(x=float(local[0, 2]), y=float(local[1, 2]), rotation=math.degrees(math.atan2(local[1, 0], local[0, 0])))


def pixel_coverage(rig, side):
    w = worlds(rig)
    part = next(p for p in rig['parts'] if p['name'] == f'arm_{side}')
    lower = next(b for b in rig['bones'] if b['name'] == f'arm_{side}_2')
    tip = w[lower['name']] @ np.array([lower['length'], 0., 1.])
    local = np.linalg.inv(artwork(rig)[part['name']]) @ tip
    with Image.open(ROOT / rig['textures'][part['texture']]) as image:
        alpha = np.asarray(image.convert('RGBA'))[:, :, 3]
    x, y = local[:2] + np.array([part['originX'] * alpha.shape[1], part['originY'] * alpha.shape[0]])
    ix, iy = int(math.floor(x)), int(math.floor(y))
    opacity = int(alpha[iy, ix]) if 0 <= ix < alpha.shape[1] and 0 <= iy < alpha.shape[0] else 0
    return {'pixel': [float(x), float(y)], 'alpha': opacity}


def main():
    if OUT.exists() or SPEC.exists():
        raise SystemExit('Refusing to overwrite placement lock or backups')
    names = ['hero-c3-B7', 'neutral-skeleton-c-v1', 'time-travel-torso-fresh-master-v3']
    paths = [ROOT / f'src/data/{name}.rig.json' for name in names]
    saved = {p: p.read_bytes() for p in paths}
    rigs = {p: json.loads(raw) for p, raw in saved.items()}
    source = rigs[paths[2]]
    source_world = worlds(source)
    desired_anchor = artwork(source)['arm_B'][:2, 2].copy()
    delta = desired_anchor - source_world['arm_B_1'][:2, 2]
    # Refuse a surprise source state rather than silently locking a different placement.
    assert np.linalg.norm(delta - np.array([12.1953473616265, -6.00176663402283])) < .01
    neutral = rigs[paths[1]]
    angles, registration = {}, {}
    for side in ('F', 'B'):
        upright = ROOT / neutral['textures'][f'arm_{side}']
        angles[side], registration[side] = recover_drawn_angle(upright.with_name(f'arm_{side}.png'), upright)
        registration[side]['restore_world_angle'] = angles[side]
    prepared, reports = {}, []
    for path, original in rigs.items():
        rig = copy.deepcopy(original)
        before = artwork(original)
        upper = next(b for b in rig['bones'] if b['name'] == 'arm_B_1')
        parent = worlds(rig)[upper['parent']]
        local = np.linalg.inv(parent) @ np.array([*desired_anchor, 1.])
        upper.update(x=float(local[0]), y=float(local[1]))
        w = worlds(rig)
        for part in rig['parts']:
            if part['name'] == 'arm_B':
                desired = before['arm_B'].copy()
                if path != paths[2]: desired[:2, 2] += delta
                bind_to_world(part, w[part['bone']], desired)
            if path == paths[1] and part['name'] in ('arm_F', 'arm_B'):
                side = part['name'][-1]
                desired = matrix(*w[part['bone']][:2, 2], angles[side])
                bind_to_world(part, w[part['bone']], desired)
        rig['skeletonVersion'] = VERSION
        for bone in rig['bones']:
            if bone['name'].startswith('arm_') and 'drawnRotation' in bone: bone['drawnRotation'] = bone['rotation']
        after = artwork(rig)
        if path == paths[2]:
            assert max(np.abs(before[n] - after[n]).max() for n in before) < 1e-8, 'User artwork moved'
        for name in before:
            if name not in ('arm_F', 'arm_B'): assert np.abs(before[name] - after[name]).max() < 1e-8
        assert rig['clips'] == original['clips']
        coverage = {side: pixel_coverage(rig, side) for side in ('F', 'B')} if path == paths[1] else None
        if coverage: assert all(p['alpha'] > 128 for p in coverage.values()), coverage
        prepared[path] = rig
        reports.append({'rig': rig['name'], 'before_sha256': hashlib.sha256(saved[path]).hexdigest(), 'neutral_palm_coverage': coverage})
    bones = [b for b in prepared[paths[0]]['bones'] if b['name'].startswith('arm_')]
    spec = {'version': VERSION, 'master': 'src/data/hero-c3-B7.rig.json',
            'arm_B_anchor_rig': desired_anchor.tolist(), 'arm_B_anchor_fullbody': (desired_anchor + [359.2, 888]).tolist(),
            'user_delta_world': delta.tolist(), 'bones': bones, 'neutral_registration': registration,
            'placement_policy': 'arm_B source shoulder pivot maps to the canonical anchor; undo upright rotation so art retains its drawn slant; no legacy rest-angle override',
            'scope': 'maintained master, Neutral, current Time Travel and all future outfit builds; historical draft rigs are retained'}
    for path in paths: assert path.read_bytes() == saved[path], f'{path} changed while preparing'
    OUT.mkdir(parents=True)
    for path in paths:
        (OUT / f'{path.stem}-before.json').write_bytes(saved[path])
        assert path.read_bytes() == saved[path]
        path.write_text(json.dumps(prepared[path], ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    SPEC.write_text(json.dumps(spec, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    report = {'version': VERSION, 'spec': str(SPEC.relative_to(ROOT)), 'user_time_travel_art_unchanged': True, 'rigs': reports}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
