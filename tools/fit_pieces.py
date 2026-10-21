"""Place pieces drawn by image_gen back onto the approved full body (pipeline step 3).

Usage: python tools/fit_pieces.py <fullbody.png> <raw_dir> <out_dir>
<raw_dir> holds <piece>-raw.png for any of head, torso, arm_F, arm_B, leg_F, leg_B; pieces without a
raw file are skipped, and an existing <out_dir>/placement.json is updated, so a piece reused
from an earlier outfit can be copied into <out_dir> first (with its placement.json entry).
The boxes below are for the arms-out rest pose, in full-body px; step 2 crops each piece
with the same box (the head box covers big spiky hair).
For each piece, SIFT features of the image_gen piece are matched to the full body
(inside that piece's crop box, grown a little) and a similarity transform (uniform
scale + rotation + translation) is estimated with RANSAC. The piece is resampled into
full-body pixels (1 full-body px = 1 rig unit), then cropped to its own bbox + margin.
Writes <piece>.png, placement.json (canvas origin in full-body px, scale, rotation,
inliers) and prints the numbers. Only numpy + Pillow + OpenCV (local); no network.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from pipeline_frame import load_frame, shifted_box

ROOT = Path(__file__).resolve().parent.parent
BASE_RIG = ROOT / 'src/data/hero-c3-B7.rig.json'
BOXES = {'head': (30, 30, 650, 530), 'torso': (160, 480, 560, 895),
         'arm_F': (60, 500, 330, 900), 'arm_B': (400, 500, 640, 900),
         'leg_F': (215, 840, 410, 1125), 'leg_B': (360, 840, 590, 1125)}
GROW = 40
MIN_INLIERS = 30  # fewer matches than this: the fit may be off, check its overlay
MARGIN = 6
SPEC = {'neck': (340, 490), 'sh_F': (265, 580), 'sh_B': (435, 560), 'fist_F': (190, 834), 'fist_B': (521, 813),
        'hip_F': (306, 781), 'hip_B': (427, 781), 'sole': 1119}
MASTER_TEXTURES = {'arm_F': 'arm_F', 'arm_B': 'arm_B', 'leg_F': 'leg_F', 'leg_B': 'leg_F'}


def gray_on_grey(rgba):
    """Composite on mid grey so outlines and fills give features, not the background."""
    a = rgba[..., 3:4] / 255.0
    rgb = rgba[..., :3] * a + 128 * (1 - a)
    return cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)


def register(raw, full, box, excluded=()):
    sift = cv2.SIFT_create(nfeatures=4000)
    g_raw = gray_on_grey(raw)
    m_raw = (raw[..., 3] > 128).astype(np.uint8) * 255
    x0, y0, x1, y1 = box
    x0, y0 = max(x0 - GROW, 0), max(y0 - GROW, 0)
    x1, y1 = min(x1 + GROW, full.shape[1]), min(y1 + GROW, full.shape[0])
    g_full = gray_on_grey(full)
    m_full = np.zeros(g_full.shape, np.uint8)
    m_full[y0:y1, x0:x1] = 255
    m_full &= ((full[..., 3] > 128).astype(np.uint8) * 255)
    for ex0, ey0, ex1, ey1 in excluded:
        m_full[max(0, ey0):min(full.shape[0], ey1), max(0, ex0):min(full.shape[1], ex1)] = 0
    # bring the raw piece near full-body scale first so SIFT scales overlap well
    s0 = (x1 - x0) / max(np.ptp(np.where(m_raw.any(0))[0]), 1)
    s0 = min(s0, (y1 - y0) / max(np.ptp(np.where(m_raw.any(1))[0]), 1))
    small = cv2.resize(g_raw, None, fx=s0, fy=s0, interpolation=cv2.INTER_AREA)
    msmall = cv2.resize(m_raw, None, fx=s0, fy=s0, interpolation=cv2.INTER_NEAREST)
    k1, d1 = sift.detectAndCompute(small, msmall)
    k2, d2 = sift.detectAndCompute(g_full, m_full)
    if d1 is None or d2 is None or len(d2) < 2:
        raise ValueError('Piece has too few features to register; inspect the piece and ownership plan')
    matches = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [m for m, n in matches if m.distance < 0.8 * n.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good]) / s0
    dst = np.float32([k2[m.trainIdx].pt for m in good])
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0,
                                         maxIters=20000, confidence=0.999)
    if M is None or inl is None:
        raise ValueError('Piece registration failed; no placement accepted')
    return M, int(inl.sum()), len(good)


def alpha_bbox(a):
    ys, xs = np.where(a > 128)
    return xs.min(), ys.min(), xs.max(), ys.max()


def master_edit_register(raw, name, frame):
    """Deterministic placement for Traveler master-edit limbs.

    ImageGen changes the output canvas, so map the production part's normalized pivot inside its
    opaque bounds onto the generated part, then use fixed skeleton endpoints. This avoids SIFT
    locking onto repeated bands or buckles. It is placement only: no non-uniform width correction.
    """
    base = json.loads(BASE_RIG.read_text(encoding='utf8'))
    source_name = 'leg_F' if name.startswith('leg_') else name
    part = next(p for p in base['parts'] if p['name'] == source_name)
    tex_key = MASTER_TEXTURES[name]
    master = np.asarray(Image.open(ROOT / base['textures'][tex_key]).convert('RGBA'))
    mx0, my0, mx1, my1 = alpha_bbox(master[..., 3])
    mp = np.array([part['originX'] * master.shape[1], part['originY'] * master.shape[0]], float)
    uv = np.array([(mp[0] - mx0) / max(mx1 - mx0, 1), (mp[1] - my0) / max(my1 - my0, 1)])
    rx0, ry0, rx1, ry1 = alpha_bbox(raw[..., 3])
    pivot = np.array([rx0 + uv[0] * (rx1 - rx0), ry0 + uv[1] * (ry1 - ry0)], float)
    off = np.array(frame['offset'], float)

    if name.startswith('arm_'):
        side = name[-1]
        fist = np.array(find_fist_alpha(raw[..., 3] > 128, pivot), float)
        target_pivot = np.array(SPEC[f'sh_{side}'], float) + off
        target_end = np.array(SPEC[f'fist_{side}'], float) + off
        src_v, dst_v = fist - pivot, target_end - target_pivot
        scale = np.linalg.norm(dst_v) / max(np.linalg.norm(src_v), 1)
        angle = np.arctan2(dst_v[1], dst_v[0]) - np.arctan2(src_v[1], src_v[0])
    else:
        side = name[-1]
        target_pivot = np.array(SPEC[f'hip_{side}'], float) + off
        sole = float(np.where(raw[..., 3] > 128)[0].max())
        scale = (SPEC['sole'] - SPEC[f'hip_{side}'][1]) / max(sole - pivot[1], 1)
        angle = 0.0

    c, s = np.cos(angle) * scale, np.sin(angle) * scale
    M = np.array([[c, -s, 0.0], [s, c, 0.0]], np.float32)
    M[:, 2] = target_pivot - M[:, :2] @ pivot
    return M, 0, 0


def neutral_arm_cap_geometry(alpha):
    """Find a neutral arm's rounded cap centre, radius and cap-to-fist axis.

    Neutral arms are deliberately plain, so their generated silhouette has too few features for
    SIFT.  Reusing the production master's bbox-normalized pivot is also unsafe: a different fist
    or shoulder silhouette changes the bbox and can put the inferred pivot on the edge of the cap.

    This detector is intentionally limited to the neutral-arm construction.  The shoulder is the
    upper endpoint of the alpha mask's principal axis.  Inside the first 28% of the limb, the
    maximum of the alpha distance transform is the centre of the rounded cap.
    """
    mask = (alpha > 128).astype(np.uint8)
    ys, xs = np.where(mask)
    if len(xs) < 16:
        raise ValueError('neutral-arm pivot needs a non-empty opaque arm silhouette')

    points = np.column_stack((xs, ys)).astype(np.float64)
    centre = points.mean(axis=0)
    covariance = np.cov((points - centre).T)
    _, vectors = np.linalg.eigh(covariance)
    axis = vectors[:, -1]
    projection = (points - centre) @ axis
    endpoints = (points[np.argmin(projection)], points[np.argmax(projection)])
    shoulder_tip = endpoints[0] if endpoints[0][1] < endpoints[1][1] else endpoints[1]
    fist_tip = endpoints[1] if endpoints[0][1] < endpoints[1][1] else endpoints[0]

    limb_axis = fist_tip - shoulder_tip
    limb_axis /= max(np.linalg.norm(limb_axis), 1.0)
    along = (points - shoulder_tip) @ limb_axis
    shoulder_limit = along.min() + 0.28 * (along.max() - along.min())
    shoulder_points = points[along <= shoulder_limit].astype(np.int32)
    shoulder_mask = np.zeros_like(mask)
    shoulder_mask[shoulder_points[:, 1], shoulder_points[:, 0]] = 1
    distance = cv2.distanceTransform(shoulder_mask, cv2.DIST_L2, 5)
    py, px = np.unravel_index(np.argmax(distance), distance.shape)
    radius = float(distance[py, px])
    if radius < 2:
        raise ValueError('neutral-arm shoulder cap is too small to locate a stable pivot')
    cap = np.array([float(px), float(py)])
    fist = np.array(find_fist_alpha(mask > 0, cap), dtype=float)
    arm_axis = fist - cap
    arm_axis /= max(np.linalg.norm(arm_axis), 1.0)
    return cap, radius, arm_axis


def neutral_arm_pivot(alpha, name):
    """Find the side-specific anatomical pivot for a neutral arm.

    The near arm's rounded cap is visible and its centre is the joint.  The far arm is different:
    its visible cap hangs below/outside a hidden shoulder joint under the torso.  Preserve that
    technical relationship from the production master in cap-radius units, while deriving the
    new cap, radius and direction entirely from the current neutral PNG.
    """
    cap, radius, arm_axis = neutral_arm_cap_geometry(alpha)
    if name == 'arm_F':
        return cap
    if name != 'arm_B':
        raise ValueError(f'neutral-arm pivot only supports arm_F/arm_B, got {name}')

    base = json.loads(BASE_RIG.read_text(encoding='utf8'))
    part = next(p for p in base['parts'] if p['name'] == 'arm_B')
    master = np.asarray(Image.open(ROOT / base['textures']['arm_B']).convert('RGBA'))
    master_cap, master_radius, master_axis = neutral_arm_cap_geometry(master[..., 3])
    master_perp = np.array([-master_axis[1], master_axis[0]])
    master_pivot = np.array([part['originX'] * master.shape[1],
                             part['originY'] * master.shape[0]], dtype=float)
    master_offset = master_pivot - master_cap
    along = float(master_offset @ master_axis) / master_radius
    across = float(master_offset @ master_perp) / master_radius

    arm_perp = np.array([-arm_axis[1], arm_axis[0]])
    return cap + radius * (along * arm_axis + across * arm_perp)


def neutral_arm_register(raw, name, frame):
    """Place a neutral arm from its own rounded-cap centre to the fixed rig endpoints."""
    if name not in ('arm_F', 'arm_B'):
        raise ValueError(f'neutral-arm placement only supports arm_F/arm_B, got {name}')
    pivot = neutral_arm_pivot(raw[..., 3], name)
    fist = np.array(find_fist_alpha(raw[..., 3] > 128, pivot), dtype=float)
    side = name[-1]
    off = np.array(frame['offset'], dtype=float)
    target_pivot = np.array(SPEC[f'sh_{side}'], dtype=float) + off
    target_end = np.array(SPEC[f'fist_{side}'], dtype=float) + off
    src_v, dst_v = fist - pivot, target_end - target_pivot
    scale = np.linalg.norm(dst_v) / max(np.linalg.norm(src_v), 1.0)
    angle = np.arctan2(dst_v[1], dst_v[0]) - np.arctan2(src_v[1], src_v[0])
    c, s = np.cos(angle) * scale, np.sin(angle) * scale
    transform = np.array([[c, -s, 0.0], [s, c, 0.0]], dtype=np.float32)
    transform[:, 2] = target_pivot - transform[:, :2] @ pivot
    return transform, pivot


def neutral_torso_register(raw, frame):
    """Place a neutral torso by fixed neck-to-pelvis anchors, not SIFT texture features.

    A plain neutral body has too few distinctive features for SIFT.  Its technical
    reference is therefore the existing torso contract: the raw image's opaque
    top/bottom map to the shared neck and pelvis anchors with one uniform scale.
    This keeps the neutral width implied by the generated aspect ratio; it never
    applies a separate horizontal stretch.
    """
    x0, y0, x1, y1 = alpha_bbox(raw[..., 3])
    src_cx = (x0 + x1) / 2.0
    target_top = SPEC['neck'][1] + frame['offset'][1]
    target_bottom = SPEC['hip_F'][1] + frame['offset'][1]
    target_cx = (SPEC['hip_F'][0] + SPEC['hip_B'][0]) / 2.0 + frame['offset'][0]
    scale = (target_bottom - target_top) / max(y1 - y0, 1)
    M = np.array([[scale, 0.0, target_cx - scale * src_cx],
                  [0.0, scale, target_top - scale * y0]], dtype=np.float32)
    return M, 0, 0


def find_fist_alpha(a, shoulder):
    ys, xs = np.nonzero(a)
    d = np.hypot(xs - shoulder[0], ys - shoulder[1])
    far = d >= d.max() * 0.8
    return float(xs[far].mean()), float(ys[far].mean())


def main():
    full_p, raw_dir, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    full = np.asarray(Image.open(full_p).convert('RGBA')).astype(np.float64)
    H, W = full.shape[:2]
    pl_path = out / 'placement.json'
    placement = json.loads(pl_path.read_text()) if pl_path.exists() else {}
    frame = load_frame(full_p)
    placement['_frame'] = frame
    plan_p = raw_dir.parent / 'parts-plan.json'
    plan = json.loads(plan_p.read_text(encoding='utf8')) if plan_p.exists() else {}
    boxes = {name: shifted_box(box, frame['offset']) for name, box in BOXES.items()}
    boxes.update(plan.get('match_boxes', {}))
    for name, box in boxes.items():
        if not (raw_dir / f'{name}-raw.png').exists():
            continue
        raw = np.asarray(Image.open(raw_dir / f'{name}-raw.png').convert('RGBA')).astype(np.float64)
        placement_mode = plan.get('placement_mode', {}).get(name)
        source_pivot = None
        if placement_mode == 'neutral-torso':
            M, inl, good = neutral_torso_register(raw, frame)
            method = 'neutral neck/hip anchors'
        elif placement_mode == 'neutral-arm':
            M, source_pivot = neutral_arm_register(raw, name, frame)
            inl, good = 0, 0
            method = 'neutral rounded-cap pivot'
        elif placement_mode == 'master-edit':
            M, inl, good = master_edit_register(raw, name, frame)
            method = 'master-edit anchors'
        else:
            M, inl, good = register(raw, full, box, plan.get('exclude_from_match', {}).get(name, []))
            method = 'SIFT'
        scale = float(np.hypot(M[0, 0], M[1, 0]))
        rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
        # warp premultiplied onto a padded full-body canvas
        pad = 200
        T = M.copy()
        T[:, 2] += pad
        pre = raw.copy()
        pre[..., :3] *= pre[..., 3:4] / 255.0
        warped = cv2.warpAffine(pre.astype(np.float32), T, (W + 2 * pad, H + 2 * pad),
                                flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        a = warped[..., 3:4]
        with np.errstate(divide='ignore', invalid='ignore'):
            warped[..., :3] = np.where(a > 0, warped[..., :3] * 255.0 / a, 0)
        ys, xs = np.where(warped[..., 3] > 8)
        if not len(xs):
            raise ValueError(f'{name} placement moved the piece outside the canvas; inspect its transform')
        cx0, cy0 = xs.min() - MARGIN, ys.min() - MARGIN
        cx1, cy1 = xs.max() + MARGIN + 1, ys.max() + MARGIN + 1
        piece = np.clip(warped[cy0:cy1, cx0:cx1], 0, 255).round().astype(np.uint8)
        Image.fromarray(piece).save(out / f'{name}.png')
        origin = (int(cx0 - pad), int(cy0 - pad))
        placement[name] = dict(origin=origin, size=[int(piece.shape[1]), int(piece.shape[0])],
                               scale=round(scale, 4), rotation_deg=round(rot, 2), inliers=inl, matches=good)
        if source_pivot is not None:
            placement[name]['source_pivot'] = [round(float(v), 2) for v in source_pivot]
        if method == 'SIFT' and inl < MIN_INLIERS:
            print(f'WARNING {name}: only {inl} matches; check its overlay (step 4 re-fits the legs)')
        print(f'{name}: {method}, scale {scale:.4f} rot {rot:+.2f} deg, inliers {inl}/{good}, canvas '
              f'{piece.shape[1]}x{piece.shape[0]} at full-body origin {origin}')
    pl_path.write_text(json.dumps(placement, indent=2))


if __name__ == '__main__':
    main()
