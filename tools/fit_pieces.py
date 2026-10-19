"""Place pieces drawn by image_gen back onto the approved full body (pipeline step 3).

Usage: python tools/fit_pieces.py <fullbody.png> <raw_dir> <out_dir>
<raw_dir> holds <piece>-raw.png for any of head, torso, arm_F, arm_B, leg_F; pieces without a
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

BOXES = {'head': (30, 30, 650, 530), 'torso': (160, 480, 560, 895),
         'arm_F': (60, 500, 330, 900), 'arm_B': (400, 500, 640, 900),
         'leg_F': (215, 840, 400, 1125)}
GROW = 40
MIN_INLIERS = 30  # fewer matches than this: the fit may be off, check its overlay
MARGIN = 6


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
        M, inl, good = register(raw, full, box, plan.get('exclude_from_match', {}).get(name, []))
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
        cx0, cy0 = xs.min() - MARGIN, ys.min() - MARGIN
        cx1, cy1 = xs.max() + MARGIN + 1, ys.max() + MARGIN + 1
        piece = np.clip(warped[cy0:cy1, cx0:cx1], 0, 255).round().astype(np.uint8)
        Image.fromarray(piece).save(out / f'{name}.png')
        origin = (int(cx0 - pad), int(cy0 - pad))
        placement[name] = dict(origin=origin, size=[int(piece.shape[1]), int(piece.shape[0])],
                               scale=round(scale, 4), rotation_deg=round(rot, 2), inliers=inl, matches=good)
        if inl < MIN_INLIERS:
            print(f'WARNING {name}: only {inl} matches; check its overlay (step 4 re-fits the legs)')
        print(f'{name}: scale {scale:.4f} rot {rot:+.2f} deg, inliers {inl}/{good}, canvas '
              f'{piece.shape[1]}x{piece.shape[0]} at full-body origin {origin}')
    pl_path.write_text(json.dumps(placement, indent=2))


if __name__ == '__main__':
    main()
