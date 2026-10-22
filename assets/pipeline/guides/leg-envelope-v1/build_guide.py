from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "assets/drafts/neutral-leg-simple-v1/leg-v1.png"
OUT_DIR = Path(__file__).resolve().parent

W, H = 1024, 1536
PANTS_TOP = 179
ANKLE_Y = 1158
HIP_Y = 305
KNEE_Y = 790
SOLE_Y = 1405

# The centerline follows the accepted neutral setup bend. Widths are garment
# envelopes, not anatomy. The orange RELAXED band is the Time Travel target.
Y_KEYS = np.array([179, 195, 220, 250, 400, 550, 650, 750, 850, 950, 1050, 1120, 1158])
C_KEYS = np.array([517, 517, 514, 512, 511, 522, 529, 531, 498, 490, 496, 502, 505])
REGULAR = np.array([0, 55, 115, 166, 178, 164, 148, 142, 152, 156, 142, 126, 112])
RELAXED = np.array([0, 68, 140, 192, 207, 195, 180, 174, 184, 190, 176, 158, 143])
PUFFY_MAX = np.array([0, 80, 162, 218, 235, 225, 210, 205, 216, 222, 207, 187, 171])

COLORS = {
    "body": (146, 156, 170, 150),
    "body_line": (207, 215, 226, 235),
    "regular": (72, 201, 191, 230),
    "regular_fill": (72, 201, 191, 32),
    "relaxed": (255, 177, 71, 255),
    "relaxed_fill": (255, 177, 71, 52),
    "max": (239, 103, 119, 235),
    "max_fill": (239, 103, 119, 24),
    "joint": (245, 239, 255, 235),
    "no_detail": (255, 213, 79, 28),
    "fixed": (132, 166, 255, 235),
}


def font(name: str, size: int):
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def envelope(width_keys):
    ys = np.arange(PANTS_TOP, ANKLE_Y + 1)
    center = np.interp(ys, Y_KEYS, C_KEYS)
    half = np.interp(ys, Y_KEYS, width_keys)
    # Force the hidden upper end to be a real shallow half-ellipse rather than
    # the pointed peak produced by linear interpolation from a zero-width row.
    dome_bottom = 320
    dome = ys <= dome_bottom
    dome_radius_y = dome_bottom - PANTS_TOP
    dome_half = float(np.interp(dome_bottom, Y_KEYS, width_keys))
    t = (ys[dome] - dome_bottom) / dome_radius_y
    half[dome] = dome_half * np.sqrt(np.clip(1.0 - t * t, 0.0, 1.0))
    left = [(int(round(c - h)), int(y)) for c, h, y in zip(center, half, ys)]
    right = [(int(round(c + h)), int(y)) for c, h, y in zip(center, half, ys)]
    return left + right[::-1]


def dashed(draw, points, fill, width=4, dash=18, gap=12):
    for p0, p1 in zip(points, points[1:]):
        x0, y0 = p0
        x1, y1 = p1
        length = max(abs(x1 - x0), abs(y1 - y0))
        if length == 0:
            continue
        for start in range(0, length, dash + gap):
            end = min(start + dash, length)
            a = start / length
            b = end / length
            draw.line((x0 + (x1 - x0) * a, y0 + (y1 - y0) * a,
                       x0 + (x1 - x0) * b, y0 + (y1 - y0) * b),
                      fill=fill, width=width)


def make_clean():
    src = Image.open(SOURCE).convert("RGBA")
    data = np.array(src)
    body_mask = Image.fromarray(np.where(data[:, :, 3] > 128, 180, 0).astype("uint8"), "L")

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas, "RGBA")
    max_poly = envelope(PUFFY_MAX)
    relaxed_poly = envelope(RELAXED)
    regular_poly = envelope(REGULAR)

    d.polygon(max_poly, fill=COLORS["max_fill"])
    d.polygon(relaxed_poly, fill=COLORS["relaxed_fill"])
    d.polygon(regular_poly, fill=COLORS["regular_fill"])
    body_layer = Image.new("RGBA", (W, H), COLORS["body"])
    canvas.alpha_composite(Image.composite(body_layer, Image.new("RGBA", (W, H)), body_mask))

    d = ImageDraw.Draw(canvas, "RGBA")
    # Bend-safe zones: keep large hard details away from the knee and ankle.
    d.rectangle((300, KNEE_Y - 56, 715, KNEE_Y + 56), fill=COLORS["no_detail"])
    d.rectangle((340, ANKLE_Y - 42, 700, ANKLE_Y + 42), fill=COLORS["no_detail"])

    d.line(regular_poly + [regular_poly[0]], fill=COLORS["regular"], width=5, joint="curve")
    d.line(relaxed_poly + [relaxed_poly[0]], fill=COLORS["relaxed"], width=8, joint="curve")
    dashed(d, max_poly + [max_poly[0]], COLORS["max"], width=4)

    # Fixed joint landmarks and ground contact.
    for y in (HIP_Y, KNEE_Y, ANKLE_Y):
        c = int(round(np.interp(y, Y_KEYS, C_KEYS)))
        d.ellipse((c - 13, y - 13, c + 13, y + 13),
                  fill=(24, 23, 31, 255), outline=COLORS["joint"], width=5)
    d.line((300, SOLE_Y, 820, SOLE_Y), fill=COLORS["fixed"], width=6)
    return canvas


def make_annotated(clean):
    canvas = Image.new("RGBA", (1500, H), (24, 23, 31, 255))
    canvas.alpha_composite(clean, (0, 0))
    d = ImageDraw.Draw(canvas, "RGBA")
    title = font("arialbd.ttf", 34)
    label = font("arialbd.ttf", 24)
    body = font("arial.ttf", 21)
    small = font("arial.ttf", 18)

    d.text((1000, 86), "Shared leg garment guide", font=title, fill=(247, 243, 255, 255))
    d.text((1000, 136), "Draft v1 · right-facing setup", font=body, fill=(190, 184, 204, 255))

    entries = [
        (COLORS["body_line"], "Neutral body", "minimum anatomy inside clothing"),
        (COLORS["regular"], "Regular", "ordinary fitted garment allowance"),
        (COLORS["relaxed"], "Relaxed", "Time Travel target envelope"),
        (COLORS["max"], "Puffy max", "ceiling, not a target"),
        ((255, 213, 79, 180), "Bend-safe band", "avoid hard trim and tiny details"),
        (COLORS["fixed"], "Sole line", "fixed ground contact"),
    ]
    y = 230
    for color, name, note in entries:
        d.line((1004, y + 13, 1068, y + 13), fill=color, width=7)
        d.text((1090, y), name, font=label, fill=(247, 243, 255, 255))
        d.text((1090, y + 34), note, font=small, fill=(190, 184, 204, 255))
        y += 98

    d.text((1000, 870), "Fixed across outfits", font=label, fill=(247, 243, 255, 255))
    fixed = [
        "• hidden rounded hip dome",
        "• hip / knee / ankle heights",
        "• setup bend and sole contact",
        "• plain mesh-bending zones",
    ]
    y = 914
    for line in fixed:
        d.text((1005, y), line, font=body, fill=(214, 208, 224, 255))
        y += 40

    d.text((1000, 1112), "Chosen per outfit", font=label, fill=(247, 243, 255, 255))
    chosen = [
        "• regular / relaxed / puffy envelope",
        "• cloth folds and material",
        "• boot silhouette and costume details",
    ]
    y = 1156
    for line in chosen:
        d.text((1005, y), line, font=body, fill=(214, 208, 224, 255))
        y += 40
    return canvas


clean = make_clean()
clean.save(OUT_DIR / "leg-garment-envelope-ref-v1.png")
make_annotated(clean).convert("RGB").save(OUT_DIR / "leg-garment-envelope-guide-v1.png", quality=95)
print(OUT_DIR / "leg-garment-envelope-guide-v1.png")
