"""Restore exact approved full-body pixels over a reconstructed neutral arm.

This is intentionally scoped to the neutral scaffold.  The reconstructed placed arm supplies
only hidden shoulder coverage; every visible arm pixel comes from the accepted full body.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


NEAR_POLYGON = np.asarray([
    (239, 548), (234, 556), (228, 570), (224, 580), (215, 600),
    (206, 620), (197, 640), (171, 680), (155, 720), (147, 740),
    (111, 752), (99, 778), (101, 816),
    (124, 850), (159, 862), (192, 851), (215, 831), (224, 803),
    (230, 772), (222, 740), (236, 720), (253, 680), (281, 640),
    (280, 620), (280, 600), (280, 580), (280, 560), (280, 548),
], dtype=np.int32)


def visible_mask(full: np.ndarray) -> np.ndarray:
    h, w = full.shape[:2]
    corridor = np.zeros((h, w), np.uint8)
    cv2.fillPoly(corridor, [NEAR_POLYGON], 255)
    return (corridor > 0) & (full[..., 3] > 0)


def alpha_over(dst: np.ndarray, src: np.ndarray, mask: np.ndarray) -> np.ndarray:
    out = dst.astype(np.float32) / 255.0
    top = src.astype(np.float32) / 255.0
    sa = top[..., 3:4] * mask[..., None]
    da = out[..., 3:4]
    oa = sa + da * (1.0 - sa)
    rgb = np.where(oa > 1e-6,
                   (top[..., :3] * sa + out[..., :3] * da * (1.0 - sa)) / np.maximum(oa, 1e-6),
                   0.0)
    result = np.concatenate([rgb, oa], axis=2)
    return np.clip(result * 255.0 + 0.5, 0, 255).astype(np.uint8)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("fullbody", type=Path)
    ap.add_argument("reconstructed", type=Path,
                    help="Placed cropped reconstructed arm from fit_pieces.py")
    ap.add_argument("placement", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args()

    full = np.asarray(Image.open(args.fullbody).convert("RGBA"))
    rebuilt = np.asarray(Image.open(args.reconstructed).convert("RGBA"))
    placement = json.loads(args.placement.read_text(encoding="utf8"))
    ox, oy = placement["arm_F"]["origin"]

    canvas = np.zeros_like(full)
    h, w = rebuilt.shape[:2]
    x0, y0 = max(0, ox), max(0, oy)
    x1, y1 = min(full.shape[1], ox + w), min(full.shape[0], oy + h)
    if x1 <= x0 or y1 <= y0:
        raise ValueError("placed reconstructed arm is outside the full-body canvas")
    canvas[y0:y1, x0:x1] = rebuilt[y0 - oy:y1 - oy, x0 - ox:x1 - ox]

    mask = visible_mask(full)
    # ImageGen supplies only the few hidden rows above the approved shoulder.  The corrected
    # extraction already contains the complete visible shoulder mass and the technical pivot,
    # so every generated pixel at or below that boundary is discarded.
    visible_top = int(np.where(mask)[0].min())
    canvas[visible_top:] = 0
    merged = alpha_over(canvas, full, mask)
    ys, xs = np.where(merged[..., 3] > 0)
    if not len(xs):
        raise RuntimeError("composited arm is empty")
    bx0, bx1 = int(xs.min()), int(xs.max()) + 1
    by0, by1 = int(ys.min()), int(ys.max()) + 1
    cropped = merged[by0:by1, bx0:bx1]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(cropped, "RGBA").save(args.output)
    placement["arm_F"]["origin"] = [bx0, by0]
    placement["arm_F"]["size"] = [bx1 - bx0, by1 - by0]
    placement["arm_F"]["visible_lock"] = {
        "source": str(args.fullbody),
        "pixels": int(mask.sum()),
        "reconstructed_source": str(args.reconstructed),
    }
    args.placement.write_text(json.dumps(placement, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
