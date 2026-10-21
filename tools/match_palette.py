"""Match a generated RGBA part to an approved costume palette.

This is a deterministic post-process: it never changes alpha or geometry.  Pixels
are grouped into neutral, red, brown/orange, yellow, and cool families in HSV.
Within each family the script robustly matches saturation and value statistics to
the reference while protecting near-black linework.

Usage:
    python tools/match_palette.py match SOURCE.png REFERENCE.png OUTPUT.png
        [--report report.json] [--strength 0.85] [--value-strength 0.45]

    python tools/match_palette.py compare APPROVED.png BEFORE.png AFTER.png OUTPUT.png
        [--labels "APPROVED,BEFORE,PALETTE MATCH"]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


FAMILIES = ("neutral", "red", "brown", "yellow", "cool")


def load_rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"))


def family_masks(hsv: np.ndarray, alpha: np.ndarray) -> dict[str, np.ndarray]:
    """Return mutually exclusive colour-family masks for OpenCV HSV pixels."""
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # Do not let nearly-black outline pixels dominate the palette statistics.
    # They are intentionally left byte-for-byte unchanged by the matcher.
    # Work only on solid interior pixels.  Recolouring antialiased fringe RGB
    # makes visible speckles when the result is composited on a dark scene.
    opaque = (alpha >= 192) & (v >= 45)
    neutral = opaque & (s < 48)
    chroma = opaque & ~neutral
    red_hue = (h < 8) | (h >= 170)
    # A strict red family isolates high-chroma cloth (for example the scarf)
    # from dark reddish-brown leather.  The latter belongs with brown.
    red = chroma & red_hue & (s >= 100) & (v >= 70)
    return {
        "neutral": neutral,
        "red": red,
        "brown": chroma & ~red & (red_hue | ((h >= 8) & (h < 28))),
        "yellow": chroma & (h >= 28) & (h < 45),
        "cool": chroma & (h >= 45) & (h < 170),
    }


def stats(values: np.ndarray) -> dict[str, float | int]:
    if values.size == 0:
        return {"count": 0, "p10": 0.0, "median": 0.0, "p90": 0.0}
    p10, median, p90 = np.percentile(values.astype(np.float32), (10, 50, 90))
    return {
        "count": int(values.size),
        "p10": round(float(p10), 2),
        "median": round(float(median), 2),
        "p90": round(float(p90), 2),
    }


def robust_target(values: np.ndarray, source: np.ndarray, target: np.ndarray) -> np.ndarray:
    """Map values with median/IQR-like span; limit the scale to avoid posterising."""
    s10, sm, s90 = np.percentile(source, (10, 50, 90))
    t10, tm, t90 = np.percentile(target, (10, 50, 90))
    scale = np.clip((t90 - t10) / max(s90 - s10, 1.0), 0.70, 1.35)
    return (values - sm) * scale + tm


def circular_hue_delta(source: np.ndarray, target: np.ndarray) -> float:
    """Median hue correction in OpenCV's 0..179 range, clamped to 12 degrees."""
    sm = float(np.median(source))
    tm = float(np.median(target))
    delta = (tm - sm + 90.0) % 180.0 - 90.0
    return float(np.clip(delta, -6.0, 6.0))


def match_palette(
    source_rgba: np.ndarray,
    reference_rgba: np.ndarray,
    strength: float,
    value_strength: float,
    family_weights: dict[str, float],
) -> tuple[np.ndarray, dict]:
    src_hsv = cv2.cvtColor(source_rgba[..., :3], cv2.COLOR_RGB2HSV).astype(np.float32)
    ref_hsv = cv2.cvtColor(reference_rgba[..., :3], cv2.COLOR_RGB2HSV).astype(np.float32)
    src_masks = family_masks(src_hsv, source_rgba[..., 3])
    ref_masks = family_masks(ref_hsv, reference_rgba[..., 3])
    out = src_hsv.copy()
    report: dict[str, object] = {
        "strength": strength,
        "value_strength": value_strength,
        "family_weights": family_weights,
        "families": {},
    }

    for name in FAMILIES:
        smask, rmask = src_masks[name], ref_masks[name]
        family_report: dict[str, object] = {
            "source_s": stats(src_hsv[..., 1][smask]),
            "reference_s": stats(ref_hsv[..., 1][rmask]),
            "source_v": stats(src_hsv[..., 2][smask]),
            "reference_v": stats(ref_hsv[..., 2][rmask]),
        }
        if int(smask.sum()) < 64 or int(rmask.sum()) < 64:
            family_report["status"] = "skipped: too few pixels"
            report["families"][name] = family_report
            continue

        src_s = src_hsv[..., 1][smask]
        ref_s = ref_hsv[..., 1][rmask]
        src_v = src_hsv[..., 2][smask]
        ref_v = ref_hsv[..., 2][rmask]

        # Smoothly protect very dark outlines; full colour transfer starts near V=55.
        protect = np.clip((src_v - 18.0) / 37.0, 0.0, 1.0)
        family_weight = family_weights[name]
        sat_weight = strength * family_weight * protect
        value_weight = value_strength * family_weight * protect
        target_s = robust_target(src_s, src_s, ref_s)
        target_v = robust_target(src_v, src_v, ref_v)
        out[..., 1][smask] = src_s + (target_s - src_s) * sat_weight
        out[..., 2][smask] = src_v + (target_v - src_v) * value_weight

        # Neutral colours have no meaningful hue.  For chromatic families use a
        # small family-level correction, never a per-pixel hue replacement.
        if name != "neutral":
            hue_delta = circular_hue_delta(src_hsv[..., 0][smask], ref_hsv[..., 0][rmask])
            hue_weight = strength * family_weight * 0.55 * protect
            out[..., 0][smask] = (src_hsv[..., 0][smask] + hue_delta * hue_weight) % 180.0
            family_report["hue_delta_degrees"] = round(hue_delta * 2.0, 2)

        family_report["status"] = "matched"
        report["families"][name] = family_report

    out = np.clip(out, 0, 255).astype(np.uint8)
    rgb = cv2.cvtColor(out, cv2.COLOR_HSV2RGB)
    result = np.dstack((rgb, source_rgba[..., 3]))
    # Transparent pixels retain their original RGB too, avoiding hidden colour churn.
    transparent = source_rgba[..., 3] == 0
    result[transparent, :3] = source_rgba[transparent, :3]

    result_hsv = cv2.cvtColor(result[..., :3], cv2.COLOR_RGB2HSV)
    for name in FAMILIES:
        mask = src_masks[name]
        family_report = report["families"][name]
        family_report["result_s"] = stats(result_hsv[..., 1][mask])
        family_report["result_v"] = stats(result_hsv[..., 2][mask])
    report["alpha_identical"] = bool(np.array_equal(result[..., 3], source_rgba[..., 3]))
    return result, report


def contain(image: Image.Image, box: tuple[int, int], margin: int = 28) -> Image.Image:
    canvas = Image.new("RGBA", box, (35, 35, 43, 255))
    max_w, max_h = box[0] - margin * 2, box[1] - margin * 2
    scale = min(max_w / image.width, max_h / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = (box[0] - resized.width) // 2
    y = (box[1] - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def make_comparison(paths: list[Path], output: Path, labels: list[str]) -> None:
    images = [Image.open(path).convert("RGBA") for path in paths]
    panel_w, panel_h, label_h = 680, 1164, 58
    result = Image.new("RGBA", (panel_w * 3, panel_h + label_h), (35, 35, 43, 255))
    draw = ImageDraw.Draw(result)
    font = ImageFont.load_default(size=18)
    for index, (image, label) in enumerate(zip(images, labels)):
        panel = contain(image, (panel_w, panel_h))
        result.alpha_composite(panel, (index * panel_w, label_h))
        draw.text((index * panel_w + 16, 18), label, fill=(235, 235, 240, 255), font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    result.convert("RGB").save(output, quality=95)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    match = sub.add_parser("match", help="palette-match one RGBA image")
    match.add_argument("source", type=Path)
    match.add_argument("reference", type=Path)
    match.add_argument("output", type=Path)
    match.add_argument("--report", type=Path)
    match.add_argument("--strength", type=float, default=0.85)
    match.add_argument("--value-strength", type=float, default=0.45)
    match.add_argument(
        "--family-weights",
        default="neutral=1,red=1,brown=1,yellow=1,cool=1",
        help="comma-separated per-family multipliers, for example red=0.2,brown=1",
    )
    compare = sub.add_parser("compare", help="make an approved/before/after panel")
    compare.add_argument("approved", type=Path)
    compare.add_argument("before", type=Path)
    compare.add_argument("after", type=Path)
    compare.add_argument("output", type=Path)
    compare.add_argument("--labels", default="APPROVED FULL BODY,BEFORE,PALETTE MATCH")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "compare":
        labels = [label.strip() for label in args.labels.split(",")]
        if len(labels) != 3:
            raise SystemExit("--labels must contain exactly three comma-separated labels")
        make_comparison([args.approved, args.before, args.after], args.output, labels)
        print(f"wrote {args.output}")
        return

    if not 0.0 <= args.strength <= 1.0 or not 0.0 <= args.value_strength <= 1.0:
        raise SystemExit("strengths must be between 0 and 1")
    family_weights = {name: 1.0 for name in FAMILIES}
    for item in args.family_weights.split(","):
        name, separator, value = item.strip().partition("=")
        if not separator or name not in family_weights:
            raise SystemExit(f"invalid --family-weights item: {item!r}")
        family_weights[name] = float(value)
    if any(not 0.0 <= value <= 1.0 for value in family_weights.values()):
        raise SystemExit("family weights must be between 0 and 1")
    source = load_rgba(args.source)
    reference = load_rgba(args.reference)
    result, report = match_palette(
        source, reference, args.strength, args.value_strength, family_weights
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(result, "RGBA").save(args.output)
    report.update({
        "source": str(args.source),
        "reference": str(args.reference),
        "output": str(args.output),
    })
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
