"""Fit the accepted simple neutral leg to the current rig canvas without repainting.

Uniform opaque-height registration, transferring the saved hip pivot within bounds.
Writes a versioned draft texture and report; never changes the skeleton or source.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
rig = json.loads((ROOT/'src/data/neutral-skeleton-c-v1.rig.json').read_text())
part = next(p for p in rig['parts'] if p['name'] == 'leg_F')
source = ROOT/'assets/drafts/neutral-leg-simple-v1/leg-v1.png'
output = ROOT/'assets/drafts/neutral-leg-simple-v1/leg-fitted-v1.png'
if output.exists():
    raise SystemExit(f'Refusing to overwrite {output}')
old = np.asarray(Image.open(ROOT/rig['textures'][part['texture']]).convert('RGBA'))
raw = np.asarray(Image.open(source).convert('RGBA')).astype(np.float32)
def bounds(image):
    y,x = np.where(image[...,3] >= 128)
    return np.array([x.min(),y.min(),x.max()+1,y.max()+1],float)
a,b = bounds(old),bounds(raw)
pivot = np.array([part['originX']*old.shape[1],part['originY']*old.shape[0]])
raw_pivot = b[:2]+(pivot-a[:2])/(a[2:]-a[:2])*(b[2:]-b[:2])
scale = (a[3]-a[1])/(b[3]-b[1])
translation = pivot-raw_pivot*scale
matrix = np.array([[scale,0,translation[0]],[0,scale,translation[1]]],np.float32)
raw[...,:3] *= raw[...,3:4]/255
placed = cv2.warpAffine(raw,matrix,(old.shape[1],old.shape[0]),flags=cv2.INTER_AREA)
alpha = placed[...,3:4]
placed[...,:3] = np.divide(placed[...,:3]*255,alpha,out=np.zeros_like(placed[...,:3]),where=alpha>0)
Image.fromarray(np.clip(placed,0,255).round().astype(np.uint8)).save(output)
output.with_suffix('.json').write_text(json.dumps(dict(source=str(source),scale=scale,
    source_pivot=raw_pivot.tolist(),target_pivot=pivot.tolist(),translation=translation.tolist(),
    canvas=[old.shape[1],old.shape[0]],note='Uniform fit; anatomical joint coverage needs renderer review.'),indent=2))
print(output)
