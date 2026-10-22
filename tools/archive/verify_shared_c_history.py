"""Read-only shared-C regression checks; optional disposable UI test rig."""
import copy
import json
import sys
from pathlib import Path

from build_rig_from_pieces import configure_arm_geometry, place_parts
from promote_shared_c import ARM_NAMES, artwork, worlds
from lock_shared_arm_placement import pixel_coverage
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    return json.loads((ROOT / f'src/data/{name}.rig.json').read_text(encoding='utf-8'))


spec = json.loads((ROOT / 'docs/rig-spec/shared-arm-placement.json').read_text(encoding='utf-8'))
for name in ['hero-c3-B7', 'neutral-skeleton-c-v1', 'time-travel-torso-fresh-master-v3']:
    rig = load(name)
    assert rig['skeletonVersion'] == spec['version']
    assert [b for b in rig['bones'] if b['name'] in ARM_NAMES] == spec['bones']
    bones = {b['name']: b for b in rig['bones']}
    assert bones['root']['y'] == -107
    assert bones['torso']['length'] == 110 and bones['chest']['x'] == 110
    for side in ('F', 'B'):
        assert bones[f'leg_{side}_1']['length'] == bones[f'leg_{side}_2']['x'] == 154.96
        assert bones[f'leg_{side}_2']['length'] == bones[f'leg_{side}_3']['x'] == 143.04
    assert all(item['soleHeight'] == 40 for item in rig['footPlants'])
    assert all(item.get('squash') == .04 and item.get('squashAt') == .2 for item in rig['footPlants'])
    for p in rig['parts']:
        if p['name'] in ('arm_F', 'arm_B'):
            assert p['mesh']['blend'] == 40 and p['mesh']['cols'] == 16 and p['mesh']['rows'] == 64
    before = copy.deepcopy(rig['bones'])
    configure_arm_geometry(rig, {}, '.')  # No piece landmarks are needed/consulted in shared mode.
    assert before == rig['bones']
    original = json.loads((ROOT / f'assets/drafts/shared-arm-placement-v2/{name}.rig-before.json').read_text(encoding='utf-8'))
    # Clips are user-editable and now resolved through the shared library.
    assert rig['animationLibrary'] == rig['skeletonVersion']
    before_art, after_art = artwork(original), artwork(rig)
    for part in before_art:
        if part not in ('arm_F', 'arm_B') or name == 'time-travel-torso-fresh-master-v3':
            assert np.abs(before_art[part]-after_art[part]).max() < 1e-8
    anchor = artwork(rig)['arm_B'][:2, 2]
    assert np.linalg.norm(anchor - spec['arm_B_artwork_anchor_rig']) < 1e-8
    assert np.allclose(worlds(rig)['arm_B_1'][:2, 2], spec['arm_B_bone_origin_rig'])
    promoted_from = json.loads((ROOT / f'assets/drafts/shared-elbow-center-v3/{name}.rig.json').read_text(encoding='utf-8'))
    promoted_art = artwork(promoted_from)
    for part in after_art:
        assert np.abs(promoted_art[part] - after_art[part]).max() < 1e-8, 'Promotion moved artwork'
    old_world, new_world = worlds(promoted_from), worlds(rig)
    assert np.allclose(old_world['arm_F_1'][:2, 2], new_world['arm_F_1'][:2, 2])
    assert np.allclose(new_world['arm_F_2'][:2, 2] - old_world['arm_F_2'][:2, 2], [-14, 0])
    old_lower = next(b for b in promoted_from['bones'] if b['name'] == 'arm_F_2')
    new_lower = next(b for b in rig['bones'] if b['name'] == 'arm_F_2')
    assert np.allclose(old_world['arm_F_2'] @ [old_lower['length'], 0, 1], new_world['arm_F_2'] @ [new_lower['length'], 0, 1])
    v4_before = json.loads((ROOT / f'assets/drafts/shared-armb-center-v4/{name}.rig.json').read_text(encoding='utf-8'))
    for part, transform in artwork(v4_before).items():
        assert np.allclose(transform, after_art[part]), 'Far-arm promotion moved artwork'
    old_far = next(b for b in v4_before['bones'] if b['name'] == 'arm_B_2')
    new_far = next(b for b in rig['bones'] if b['name'] == 'arm_B_2')
    assert np.allclose(worlds(v4_before)['arm_B_2'] @ [old_far['length'], 0, 1], worlds(rig)['arm_B_2'] @ [new_far['length'], 0, 1])
    accepted = load('time-travel-armb-center-trial-v1')
    accepted_world, rig_world = worlds(accepted), worlds(rig)
    for bone_name in ('arm_B_1', 'arm_B_2'):
        assert np.allclose(accepted_world[bone_name][:2, 2], rig_world[bone_name][:2, 2])
    if name == 'neutral-skeleton-c-v1':
        for side in ('F', 'B'):
            assert pixel_coverage(rig, side)['alpha'] > 128
            reference = load('time-travel-torso-fresh-master-v3')
            actual = next(p for p in rig['parts'] if p['name'] == f'arm_{side}')
            expected = next(p for p in reference['parts'] if p['name'] == f'arm_{side}')
            for field in ('x', 'y', 'rotation'):
                assert abs(actual.get(field, 0) - expected.get(field, 0)) < 1e-8
    trial = copy.deepcopy(rig)
    pieces = {'arm_B': {'canvas': [100, 300], 'origin_in_fullbody': [999, 999],
                        'pivot_shoulder': [50, 20], 'image_rotation': 12.34}}
    place_parts(trial, pieces, str(ROOT / 'assets/drafts'), {'arm_B'})
    part = next(p for p in trial['parts'] if p['name'] == 'arm_B')
    assert np.allclose(artwork(trial)['arm_B'][:2, 2], spec['arm_B_artwork_anchor_rig'], atol=.02), 'Builder ignored canonical artwork anchor'
    assert abs(part['x']) + abs(part['y']) > 1, 'Builder snapped artwork back to bone origin'
    assert trial['bones'] == rig['bones']
    print(f'{name}: locked anchor, shared C bones, attachment contract, clips and builder freeze passed')

if '--ui-fixture' in sys.argv:
    path = ROOT / 'src/data/setup-blend-controls-test-v1.rig.json'
    if path.exists():
        raise SystemExit(f'Refusing to overwrite {path}')
    rig = load('time-travel-torso-fresh-master-v3')
    rig['name'] = 'setup-blend-controls-test-v1'
    path.write_text(json.dumps(rig, indent=2)+'\n', encoding='utf-8')
    print(f'Created disposable UI fixture: {path}')
