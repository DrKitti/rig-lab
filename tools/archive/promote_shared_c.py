"""One-time, backed-up C-arm promotion. Does not touch textures or historical drafts.

python tools/promote_shared_c.py
Run once; an existing migration backup makes this refuse to run again.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/drafts/shared-skeleton-c-v1'
VERSION = 'neutral-c-v1'
SOURCE = ROOT / 'src/data/tt-joint-study-v1-c.rig.json'
ARM_NAMES = {f'arm_{side}_{i}' for side in ('F', 'B') for i in (1, 2)}


def matrix(x=0., y=0., degrees=0., sx=1., sy=1.):
    r = math.radians(degrees)
    c, s = math.cos(r), math.sin(r)
    return np.array([[c*sx, -s*sy, x], [s*sx, c*sy, y], [0., 0., 1.]])


def worlds(rig):
    bones = {b['name']: b for b in rig['bones']}
    result = {}

    def solve(name):
        if name in result:
            return result[name]
        b = bones[name]
        m = matrix(b['x'], b['y'], b['rotation'], b.get('scaleX', 1), b.get('scaleY', 1))
        if b.get('parent'):
            parent = solve(b['parent'])
            if b.get('inheritRotation') is False:
                m[:2, 2] = (parent @ m[:, 2])[:2]
            else:
                m = parent @ m
        result[name] = m
        return m

    for name in bones:
        solve(name)
    return result


def artwork(rig):
    w = worlds(rig)
    return {p['name']: w[p['bone']] @ matrix(p.get('x', 0), p.get('y', 0), p['rotation']) for p in rig['parts']}


def migrate(original, source):
    rig = copy.deepcopy(original)
    before = artwork(original)
    source_bones = {b['name']: b for b in source['bones']}
    for index, b in enumerate(rig['bones']):
        if b['name'] in ARM_NAMES:
            rig['bones'][index] = copy.deepcopy(source_bones[b['name']])
    w = worlds(rig)
    for part in rig['parts']:
        if part['name'] not in ('arm_F', 'arm_B'):
            continue
        local = np.linalg.inv(w[part['bone']]) @ before[part['name']]
        part.update(x=float(local[0, 2]), y=float(local[1, 2]),
                    rotation=math.degrees(math.atan2(local[1, 0], local[0, 0])))
        if part.get('mesh'):
            part['mesh'].update(cols=16, rows=64, blend=40)
            if part['mesh'].get('blends'):
                part['mesh']['blends'][0] = 40
    rig['skeletonVersion'] = VERSION
    after = artwork(rig)
    error = max(float(np.max(np.abs(before[n]-after[n]))) for n in before)
    assert error < 1e-8, error
    assert original['clips'] == rig['clips']
    assert [b for b in original['bones'] if b['name'] not in ARM_NAMES] == [b for b in rig['bones'] if b['name'] not in ARM_NAMES]
    return rig, error


def main():
    if OUT.exists():
        raise SystemExit(f'Refusing to overwrite migration backup: {OUT}')
    source = json.loads(SOURCE.read_text(encoding='utf-8'))
    target_names = ['hero-c3-B7', 'time-travel-torso-fresh-master-v3']
    prepared = []
    for name in target_names:
        path = ROOT / f'src/data/{name}.rig.json'
        saved = path.read_bytes()
        rig, error = migrate(json.loads(saved), source)
        prepared.append((path, saved, rig, error))
    neutral_path = ROOT / 'src/data/neutral-skeleton-c-v1.rig.json'
    if neutral_path.exists():
        raise SystemExit(f'Refusing to overwrite {neutral_path}')
    old_neutral = json.loads((ROOT / 'src/data/neutral-skeleton-candidate-v1.rig.json').read_text(encoding='utf-8'))
    neutral, neutral_error = migrate(old_neutral, source)
    neutral['name'] = 'neutral-skeleton-c-v1'
    for path, saved, _, _ in prepared:
        assert path.read_bytes() == saved, f'{path} changed while preparing'
    OUT.mkdir(parents=True)
    reports = []
    for path, saved, rig, error in prepared:
        (OUT / f'{path.stem}-before.json').write_bytes(saved)
        assert path.read_bytes() == saved, f'{path} changed before write'
        path.write_text(json.dumps(rig, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        reports.append({'rig': rig['name'], 'before_sha256': hashlib.sha256(saved).hexdigest(), 'rest_art_matrix_error': error, 'clips_preserved': True})
    neutral_path.write_text(json.dumps(neutral, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    reports.append({'rig': neutral['name'], 'rest_art_matrix_error': neutral_error, 'historical_candidate_unchanged': True})
    report = {'version': VERSION, 'arm_source': str(SOURCE.relative_to(ROOT)), 'root_changed': False,
              'leg_geometry_changed': False, 'arm_mesh': {'cols': 16, 'rows': 64, 'blend': 40}, 'rigs': reports}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
