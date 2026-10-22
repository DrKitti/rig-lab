"""Extract the approved neutral full-body arms as exact runtime parts.

This is deliberately a geometry-preserving extraction for the neutral scaffold:
the accepted full body is the authority for the arm silhouette and fist anatomy.
It is not an outfit extraction utility.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def crop_part(
    rgba: np.ndarray,
    polygon: list[tuple[int, int]],
    out_path: Path,
    inner: list[tuple[int, int]],
    side: str,
) -> None:
    h, w = rgba.shape[:2]
    poly = np.asarray(polygon, dtype=np.int32)
    mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(mask, [poly], 255)

    # Keep the original alpha, including the black outline, only inside the arm
    # corridor.  The polygons stop at the shoulder seam and follow the outside
    # contour; the fist is already inside the same polygon.
    alpha = rgba[..., 3]
    alpha = np.where((mask > 0) & (alpha > 0), alpha, 0).astype(np.uint8)
    # Remove the torso-side sliver.  `inner` is the visible inside contour;
    # near arm keeps x <= contour and far arm keeps x >= contour.
    if inner:
        ys_i = np.array([p[1] for p in inner], dtype=float)
        xs_i = np.array([p[0] for p in inner], dtype=float)
        ylo, yhi = max(0, int(ys_i.min())), min(h - 1, int(ys_i.max()))
        for y in range(ylo, yhi + 1):
            xcut = int(round(np.interp(y, ys_i, xs_i)))
            if side == "near":
                alpha[y, max(0, xcut + 1):] = 0
            else:
                alpha[y, :max(0, xcut)] = 0
    ys, xs = np.where(alpha > 0)
    if not len(xs):
        raise RuntimeError(f"empty extraction for {out_path}")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    out = rgba[y0:y1, x0:x1].copy()
    out[..., 3] = alpha[y0:y1, x0:x1]
    Image.fromarray(out, "RGBA").save(out_path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("fullbody", type=Path)
    ap.add_argument("out_dir", type=Path)
    args = ap.parse_args()
    rgba = np.asarray(Image.open(args.fullbody).convert("RGBA"))
    args.out_dir.mkdir(parents=True, exist_ok=True)

    # Coordinates are in the approved neutral full-body canvas (671x1164).
    # Each polygon follows the visible arm contour and includes its fist.
    near = [
        (239, 548), (234, 556), (228, 570), (224, 580), (215, 600),
        (206, 620), (197, 640), (171, 680), (155, 720), (147, 740),
        (111, 752), (99, 778), (101, 816),
        (124, 850), (159, 862), (192, 851), (215, 831), (224, 803),
        (230, 772), (222, 740), (236, 720), (253, 680), (281, 640),
        (280, 620), (280, 600), (280, 580), (280, 560), (280, 548),
    ]
    far = [
        (445, 548), (453, 545), (470, 563), (486, 598), (504, 635),
        (523, 676), (545, 713), (564, 732), (603, 735), (631, 754),
        (647, 790), (645, 827), (625, 854), (596, 866), (560, 857),
        (536, 837), (520, 810), (504, 776), (487, 739), (469, 704),
        (452, 664), (445, 622), (440, 584),
    ]
    crop_part(
        rgba, near, args.out_dir / "arm_F-raw.png",
        [], "near-full",
    )
    crop_part(
        rgba, far, args.out_dir / "arm_B-raw.png",
        [(462, 548), (475, 580), (489, 620), (504, 660), (522, 700), (538, 740)],
        "far",
    )


if __name__ == "__main__":
    main()
