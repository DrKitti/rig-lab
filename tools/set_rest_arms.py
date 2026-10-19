"""Last pipeline step: turn the arms from the drawn arms-out pose to the standard rest pose.

    python tools/set_rest_arms.py <rig-name> [<rig-name> ...]

Run it after everything has been checked in the drawn pose (rest pose vs the full body, sizes,
bends). For each src/data/<rig-name>.rig.json (re-read, edited in place) it turns the upper-arm
bones arm_F_1 / arm_B_1 so they point at the standard world angles below; the arm images turn
with them about the shoulder, so no art changes. Every outfit then stands with the same arms.
Clip keys are offsets from this rest pose. The drawn angle is kept in each bone's
"drawnRotation", so Rig Lab's Setup mode can switch back to the drawn pose to check it.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# World angle of shoulder -> fist, degrees (0 = right, 90 = straight down): hero c3's
# arms-down pose, the one Rig Lab showed before the arms-out pipeline.
REST = {'arm_F_1': 106.5, 'arm_B_1': 71.3}


def world_rotation(bones, name):
    b, r = bones[name], 0.0
    while b:
        r += b['rotation']
        b = bones.get(b.get('parent'))
    return r


def main() -> None:
    for name in sys.argv[1:]:
        path = os.path.join(ROOT, 'src', 'data', f'{name}.rig.json')
        rig = json.load(open(path, encoding='utf8'))
        bones = {b['name']: b for b in rig['bones']}
        for bone, target in REST.items():
            # Remember the drawn angle (Rig Lab's Setup toggle shows it); kept once recorded.
            bones[bone].setdefault('drawnRotation', bones[bone]['rotation'])
            now = world_rotation(bones, bone)
            turn = ((target - now + 180) % 360) - 180
            bones[bone]['rotation'] = round(bones[bone]['rotation'] + turn, 2)
            print(f'{name} {bone}: {now:.1f} -> {target} deg (turned {turn:+.1f})')
        with open(path, 'w', encoding='utf8') as f:
            f.write(json.dumps(rig, indent=2) + '\n')


if __name__ == '__main__':
    main()
