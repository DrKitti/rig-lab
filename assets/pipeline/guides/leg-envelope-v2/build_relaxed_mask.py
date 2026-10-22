from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

OUT_DIR = Path(__file__).resolve().parent
W, H = 1024, 1536
S = 4
TOP = 179
DOME_BOTTOM = 320
ANKLE = 1158

# A single relaxed target envelope. The screen-left edge has only a shallow
# setup articulation; the calf is not allowed to become a separate lobe.
Y_KEYS = np.array([320, 500, 650, 790, 900, 1050, 1158], dtype=float)
LEFT_KEYS = np.array([310, 320, 330, 334, 332, 344, 360], dtype=float)
RIGHT_KEYS = np.array([724, 718, 710, 700, 690, 670, 650], dtype=float)

ys = np.arange(TOP, ANKLE + 1, dtype=float)
left = np.interp(ys, Y_KEYS, LEFT_KEYS)
right = np.interp(ys, Y_KEYS, RIGHT_KEYS)

# The hidden upper thigh is a smooth half-ellipse joined to the body of the
# envelope at DOME_BOTTOM.
dome = ys <= DOME_BOTTOM
t = (ys[dome] - DOME_BOTTOM) / (DOME_BOTTOM - TOP)
center = (LEFT_KEYS[0] + RIGHT_KEYS[0]) / 2.0
half = (RIGHT_KEYS[0] - LEFT_KEYS[0]) / 2.0
ellipse_half = half * np.sqrt(np.clip(1.0 - t * t, 0.0, 1.0))
left[dome] = center - ellipse_half
right[dome] = center + ellipse_half

poly = [(round(x * S), round(y * S)) for x, y in zip(left, ys)]
poly += [(round(x * S), round(y * S)) for x, y in zip(right[::-1], ys[::-1])]

hi = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
d = ImageDraw.Draw(hi, "RGBA")
d.polygon(poly, fill=(150, 157, 166, 255))
d.line(poly + [poly[0]], fill=(43, 35, 43, 255), width=7 * S, joint="curve")

out = hi.resize((W, H), Image.Resampling.LANCZOS)
out.save(OUT_DIR / "relaxed-silhouette-ref-v1.png")

# Human-review rendering only; the transparent image above is the generation ref.
review = Image.new("RGBA", (W, H), (24, 23, 31, 255))
review.alpha_composite(out)
review.convert("RGB").save(OUT_DIR / "relaxed-silhouette-review-v1.png", quality=95)
print(OUT_DIR / "relaxed-silhouette-ref-v1.png")
