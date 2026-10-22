"""Build a rig for a new outfit from pieces placed on the full body.

Every outfit uses the shared skeleton of src/data/shared-master.rig.json. This copies that rig,
points its textures at the new pieces, and sets each part's pivot and offset so the piece
sits exactly where it was placed on the approved full body.

    python tools/build_rig_from_pieces.py <pieces.json> <pieces_dir> <new_rig_name>

pieces.json (written by the piece-fitting step) gives, per piece, in full-body pixels
(1 px = 1 rig unit, the historical frame in docs/archive/rig-spec/hero-c3-B7-fullbody.png):
  "canvas": [w, h], "origin_in_fullbody": [x, y], and the pivot point in piece pixels:
  head "pivot_neck", torso "pivot_hip", arm_F/arm_B "pivot_shoulder", and each leg
  "pivot_dome". When leg_B is absent, the legacy path reuses leg_F with its
  "far_leg_offset": [dx, dy].

Arms:
- ``neutral-c-*`` rigs copy the shared C arm bones unchanged. Piece metadata places artwork;
  it must not regenerate a different skeleton for every outfit.
- Legacy neutral-based metadata supplies fixed ``elbow`` and ``hand_anchor`` points. Those points
  define the two arm bones directly; the visible fist/glove silhouette does not define anatomy.
  Legacy piece sets without ``hand_anchor`` retain the old alpha-end fallback so old drafts remain
  reproducible, but that fallback is not valid for freezing canonical geometry.
- Each arm image is first turned so the shoulder -> fist line points straight down (saved as
  <piece>-upright.png next to the piece); the part is turned back by the same angle. The mesh
  grid follows the image's rows and columns, so this makes it run along the arm: a grid at a
  slant to the arm pinches the inner elbow when it bends. Warns if a turned arm still leans
  more than LEAN_LIMIT degrees.
An entry may give "png" (path from the project root) instead of <pieces_dir>/<piece>.png, and
"image_rotation" (degrees, as cv2/PIL rotate: counter-clockwise on screen) when its image was
turned from the full-body orientation; the part is turned back by that much.

    python tools/build_rig_from_pieces.py <pieces.json> <pieces_dir> <rig> --arms-only
re-poses and re-places only the arms of an existing rig (re-read, edited in place).

A new rig reuses B7's head texture and head attachment exactly (pass --own-head to place the
fitted head piece instead) and gets the leg mesh LEG_MESH.

Writes src/data/<new_rig_name>.rig.json; refuses to overwrite an existing rig.
"""

import json
import math
import os
import re
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_RIG = os.path.join(ROOT, 'src', 'data', 'shared-master.rig.json')
# Full-body pixel of the rig origin in docs/archive/rig-spec/hero-c3-B7-fullbody.png.
FULLBODY_ORIGIN = (359.2, 888.0)

# part name -> (piece key in pieces.json, pivot key, texture key in the rig)
PARTS = {
    'head': ('head', 'pivot_neck', 'head'),
    'torso': ('torso', 'pivot_hip', 'torso_B'),
    'arm_F': ('arm_F', 'pivot_shoulder', 'arm_F'),
    'arm_B': ('arm_B', 'pivot_shoulder', 'arm_B'),
    'leg_F': ('leg_F', 'pivot_dome', 'leg_F'),
    'leg_B': ('leg_B', 'pivot_dome', 'leg_B'),
}


def world_matrices(rig):
    """Setup-pose world matrix (a, b, c, d, tx, ty) per bone, Pixi convention, y down."""
    bones = {b['name']: b for b in rig['bones']}
    out = {}

    def solve(name):
        if name in out:
            return out[name]
        b = bones[name]
        r = math.radians(b['rotation'])
        sx, sy = b.get('scaleX', 1), b.get('scaleY', 1)
        m = (math.cos(r) * sx, math.sin(r) * sx, -math.sin(r) * sy, math.cos(r) * sy, b['x'], b['y'])
        if b.get('parent'):
            p = solve(b['parent'])
            m = (p[0] * m[0] + p[2] * m[1], p[1] * m[0] + p[3] * m[1],
                 p[0] * m[2] + p[2] * m[3], p[1] * m[2] + p[3] * m[3],
                 p[0] * m[4] + p[2] * m[5] + p[4], p[1] * m[4] + p[3] * m[5] + p[5])
        out[name] = m
        return m

    for n in bones:
        solve(n)
    return out


FIST_END = 0.2   # the fist = the arm pixels in the last 20% of the distance from the shoulder
LEAN_LIMIT = 5   # degrees an upright arm may still lean


def piece_png(info, pieces_dir, key):
    return os.path.join(ROOT, info['png']) if 'png' in info else os.path.join(pieces_dir, f'{key}.png')


def find_fist(png, shoulder):
    """Fist centre in piece px: the middle of the arm pixels farthest from the shoulder."""
    a = np.asarray(Image.open(png).convert('RGBA'))[..., 3] > 128
    ys, xs = np.nonzero(a)
    d = np.hypot(xs - shoulder[0], ys - shoulder[1])
    far = d >= d.max() * (1 - FIST_END)
    return float(xs[far].mean()), float(ys[far].mean())


def arm_fist(info, pieces_dir, key):
    """Arm endpoint in full-body px; prefer the fixed anatomical palm anchor."""
    ox, oy = info['origin_in_fullbody']
    if 'hand_anchor' in info:
        fx, fy = info['hand_anchor']
    else:
        fx, fy = find_fist(piece_png(info, pieces_dir, key), info['pivot_shoulder'])
        print(f'{key}: WARNING using legacy alpha-derived fist endpoint; add hand_anchor')
    return ox + fx, oy + fy


def pose_arms(rig, pieces, pieces_dir):
    """Pose arm chains from fixed landmarks, with a legacy straight-chain fallback."""
    bones = {b['name']: b for b in rig['bones']}
    parent_rot = sum(bones[n]['rotation'] for n in ('torso', 'chest') if n in bones)
    for side in ('F', 'B'):
        key = f'arm_{side}'
        info = pieces[key]
        ox, oy = info['origin_in_fullbody']
        sx, sy = ox + info['pivot_shoulder'][0], oy + info['pivot_shoulder'][1]
        fx, fy = arm_fist(info, pieces_dir, key)
        upper, lower = bones[f'arm_{side}_1'], bones[f'arm_{side}_2']
        if 'hand_anchor' in info and 'elbow' in info:
            ex, ey = ox + info['elbow'][0], oy + info['elbow'][1]
            upper_world = math.degrees(math.atan2(ey - sy, ex - sx))
            lower_world = math.degrees(math.atan2(fy - ey, fx - ex))
            upper_length = math.hypot(ex - sx, ey - sy)
            lower_length = math.hypot(fx - ex, fy - ey)
            upper['rotation'] = round(upper_world - parent_rot, 2)
            upper['length'] = lower['x'] = round(upper_length, 1)
            lower['length'] = round(lower_length, 1)
            lower['rotation'] = round(lower_world - upper_world, 2)
        else:
            half = math.hypot(fx - sx, fy - sy) / 2
            upper['rotation'] = round(math.degrees(math.atan2(fy - sy, fx - sx)) - parent_rot, 2)
            upper['length'] = lower['x'] = lower['length'] = round(half, 1)
            lower['rotation'] = 0
        upper['drawnRotation'] = upper['rotation']
        lower['y'] = 0


def upright_arms(pieces, pieces_dir):
    """Writes <piece>-upright.png per arm and points pieces[arm] at it (pivot, origin, rotation)."""
    for key in ('arm_F', 'arm_B'):
        info = pieces[key]
        src = piece_png(info, pieces_dir, key)
        ox, oy = info['origin_in_fullbody']
        sx, sy = info['pivot_shoulder']
        fx, fy = arm_fist(info, pieces_dir, key)
        fx, fy = fx - ox, fy - oy
        angle = math.degrees(math.atan2(fy - sy, fx - sx)) - 90  # cv2 angle: counter-clockwise
        img = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
        h, w = img.shape[:2]
        m = cv2.getRotationMatrix2D((sx, sy), angle, 1.0)
        corners = np.array([[0, 0, 1], [w, 0, 1], [0, h, 1], [w, h, 1]], np.float32) @ m.T
        x0, y0 = np.floor(corners.min(0)).astype(int)
        x1, y1 = np.ceil(corners.max(0)).astype(int)
        m[:, 2] -= (x0, y0)
        pre = img.copy()
        pre[..., :3] *= pre[..., 3:4] / 255.0
        r = cv2.warpAffine(pre, m, (int(x1 - x0), int(y1 - y0)), flags=cv2.INTER_CUBIC,
                           borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        r = np.clip(r, 0, 255)
        al = r[..., 3:4]
        with np.errstate(divide='ignore', invalid='ignore'):
            r[..., :3] = np.where(al > 0, r[..., :3] * 255.0 / al, 0)
        # crop to the arm, so the grid covers the arm and not empty corners
        ys, xs = np.nonzero(r[..., 3] > 8)
        cx0, cy0 = max(int(xs.min()) - 4, 0), max(int(ys.min()) - 4, 0)
        r = r[cy0:int(ys.max()) + 5, cx0:int(xs.max()) + 5]
        m[:, 2] -= (cx0, cy0)
        out = os.path.splitext(src)[0] + '-upright.png'
        Image.fromarray(np.clip(r, 0, 255).round().astype(np.uint8)).save(out)
        nsx, nsy = m @ np.array([sx, sy, 1.0])
        # check: the middle of the arm at 25% and 75% of its length should line up vertically
        a = r[..., 3] > 128
        top, bottom = int(nsy), int(np.nonzero(a.any(1))[0].max())
        mids = []
        for f in (0.25, 0.75):
            row = np.nonzero(a[int(top + (bottom - top) * f)])[0]
            mids.append((row.min() + row.max()) / 2)
        lean = math.degrees(math.atan2(mids[1] - mids[0], (bottom - top) * 0.5))
        if abs(lean) > LEAN_LIMIT and 'hand_anchor' in info and 'elbow' in info:
            note = '  INFO: bent canonical chain; verify the 90-degree elbow view'
        elif abs(lean) > LEAN_LIMIT:
            note = '  WARNING: check the elbow bend'
        else:
            note = ''
        print(f'{key}: turned {angle:+.1f} deg upright, still leans {lean:+.1f} deg{note}')
        info.update(png=os.path.relpath(out, ROOT).replace(os.sep, '/'), canvas=[int(r.shape[1]), int(r.shape[0])],
                    pivot_shoulder=[round(float(nsx), 2), round(float(nsy), 2)],
                    origin_in_fullbody=[round(ox + sx - nsx, 2), round(oy + sy - nsy, 2)],
                    image_rotation=round(angle, 2))


def place_parts(rig, pieces, pieces_dir, names):
    """Points the named parts at their pieces and sets pivot and offset from pieces.json."""
    W = world_matrices(rig)
    rel = os.path.relpath(pieces_dir, ROOT).replace(os.sep, '/')
    frame_offset = pieces.get('_frame', {}).get('offset', [0, 0])
    frame_origin = [FULLBODY_ORIGIN[i] + frame_offset[i] for i in (0, 1)]
    for part in rig['parts']:
        if part['name'] not in names:
            continue
        key, pivot_key, tex = PARTS[part['name']]
        if part['name'] == 'leg_B' and 'leg_B' not in pieces:
            key, pivot_key, tex = 'leg_F', 'pivot_dome', 'leg_F'
        info = pieces[key]
        rig['textures'][tex] = info.get('png') or f'{rel}/{key}.png'
        (cw, ch), (ox, oy), pv = info['canvas'], info['origin_in_fullbody'], info[pivot_key]
        if part['name'] == 'leg_B' and key == 'leg_F':
            ox += info.get('far_leg_offset', [0, 0])[0]
            oy += info.get('far_leg_offset', [0, 0])[1]
        # Pivot in rig space, then in the part's bone space.
        px, py = ox + pv[0] - frame_origin[0], oy + pv[1] - frame_origin[1]
        if rig.get('skeletonVersion') in ('neutral-c-v4', 'neutral-c-v5') and part['name'] == 'arm_B':
            # Artwork placement is independent of the accepted anatomical bone origin.
            with open(os.path.join(ROOT, 'docs/rig-spec/shared-arm-placement.json'), encoding='utf-8') as source:
                placement = json.load(source)
            px, py = placement['arm_B_artwork_anchor_rig']
        elif rig.get('skeletonVersion') in ('neutral-c-v2', 'neutral-c-v3') and part['name'] == 'arm_B':
            # User-locked far shoulder: artwork follows the shared anchor, not an
            # older full-body/piece pivot. Preserve its drawn orientation below.
            px, py = W[part['bone']][4:6]
        a, b, c, d, tx, ty = W[part['bone']]
        det = a * d - b * c
        dx, dy = px - tx, py - ty
        lx, ly = (d * dx - c * dy) / det, (-b * dx + a * dy) / det
        bone_rot = math.degrees(math.atan2(b, a))
        part.pop('tint', None)  # far parts are not tinted; the full body already shows depth
        part.update(texture=tex, originX=round(pv[0] / cw, 4), originY=round(pv[1] / ch, 4),
                    rotation=round(-bone_rot + info.get('image_rotation', 0), 2), x=round(lx, 2), y=round(ly, 2))


# Shared C-v5 starts the foot bone at the anatomical ankle/malleolus. The foot/shoe
# can extend rigid weighting above that joint when an outfit cuff needs it.
LEG_MESH = dict(cols=16, rows=64, blends=[8, 56], rigidFoot=True)
ARM_MESH = dict(cols=16, rows=64, blend=40)


def configure_arm_geometry(rig, pieces, pieces_dir):
    """Keep the promoted shared chain frozen; retain historical draft reproduction."""
    if rig.get('skeletonVersion') in ('neutral-c-v1', 'neutral-c-v2', 'neutral-c-v3', 'neutral-c-v4', 'neutral-c-v5'):
        for part in rig['parts']:
            if part['name'] in ('arm_F', 'arm_B') and part.get('mesh'):
                part['mesh'].update(ARM_MESH)
                if part['mesh'].get('blends'):
                    part['mesh']['blends'][0] = 40
        print(f"using shared {rig['skeletonVersion']} arm geometry; piece landmarks do not move bones")
    else:
        pose_arms(rig, pieces, pieces_dir)


def reuse_base_head(rig, base):
    """Uses the base rig's head texture and attachment as they are: the character supplies the
    head, and the head piece fitted on the outfit's full body is only for the assembly preview."""
    rig['textures']['head'] = base['textures']['head']
    head = next(p for p in base['parts'] if p['name'] == 'head')
    rig['parts'] = [dict(head) if p['name'] == 'head' else p for p in rig['parts']]


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 3:
        raise SystemExit('Usage: build_rig_from_pieces.py PIECES.json PIECES_DIR outfit-name [--arms-only] [--own-head]')
    pieces_json, pieces_dir, name = args
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name):
        raise SystemExit('Rig ID must be lowercase kebab-case')
    dst = os.path.join(ROOT, 'src', 'data', f'{name}.rig.json')
    pieces = json.load(open(pieces_json, encoding='utf8'))
    if '--arms-only' in sys.argv:
        # Re-pose and re-place only the arms of an existing rig, keeping everything else.
        rig = json.load(open(dst, encoding='utf8'))
        configure_arm_geometry(rig, pieces, pieces_dir)
        upright_arms(pieces, pieces_dir)
        place_parts(rig, pieces, pieces_dir, {'arm_F', 'arm_B'})
    else:
        if os.path.exists(dst):
            sys.exit(f'{dst} already exists; pick another name or delete it first')
        rig = json.load(open(BASE_RIG, encoding='utf8'))
        rig['name'] = name
        rig['textures'] = {}
        configure_arm_geometry(rig, pieces, pieces_dir)
        upright_arms(pieces, pieces_dir)
        place_parts(rig, pieces, pieces_dir, set(PARTS))
        if '--own-head' not in sys.argv:
            reuse_base_head(rig, json.load(open(BASE_RIG, encoding='utf8')))
        for part in rig['parts']:
            if part['name'].startswith('leg_') and part.get('mesh'):
                part['mesh'].update(LEG_MESH)
    with open(dst, 'w', encoding='utf8') as f:
        f.write(json.dumps(rig, indent=2) + '\n')
    print('wrote', os.path.relpath(dst, ROOT))


if __name__ == '__main__':
    main()
