"""Coordinate frames for padded full-body references (rig coordinates never move)."""
import json
from pathlib import Path


def load_frame(image):
    sidecar = Path(image).with_suffix('.frame.json')
    return json.loads(sidecar.read_text(encoding='utf8')) if sidecar.exists() else {
        'offset': [0, 0], 'canvas': [671, 1164]}


def shifted_box(box, offset):
    dx, dy = offset
    x0, y0, x1, y1 = box
    return (x0 + dx, y0 + dy, x1 + dx, y1 + dy)
