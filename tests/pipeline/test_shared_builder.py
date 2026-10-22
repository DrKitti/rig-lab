"""New outfit generation must keep the shared rig and independent artwork anchors."""
import copy
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'tools'))
from build_rig_from_pieces import configure_arm_geometry, place_parts, world_matrices

class SharedBuilderTests(unittest.TestCase):
    def test_locked_geometry_and_artwork_offset(self):
        spec = json.loads((ROOT/'docs/rig-spec/shared-arm-placement.json').read_text())
        for name in ('shared-master', 'neutral', 'time-travel'):
            rig = json.loads((ROOT/f'src/data/{name}.rig.json').read_text())
            before = copy.deepcopy(rig['bones'])
            configure_arm_geometry(rig, {}, '.')
            self.assertEqual(rig['bones'], before)
            self.assertEqual(rig['animationLibrary'], rig['skeletonVersion'])
            pieces = {'arm_B': {'canvas': [100,300], 'origin_in_fullbody': [999,999],
                'pivot_shoulder': [50,20], 'image_rotation': 12.34}}
            place_parts(rig, pieces, str(ROOT/'assets/pipeline'), {'arm_B'})
            part = next(p for p in rig['parts'] if p['name']=='arm_B')
            m = world_matrices(rig)['arm_B_1']
            actual = [m[0]*part['x']+m[2]*part['y']+m[4],m[1]*part['x']+m[3]*part['y']+m[5]]
            np.testing.assert_allclose(actual,spec['arm_B_artwork_anchor_rig'],atol=.02)
            self.assertEqual(rig['bones'],before)

if __name__=='__main__': unittest.main()
