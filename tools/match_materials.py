"""Material-region palette transfer. Usage: python tools/match_materials.py CONFIG.json

Config paths are relative to config's directory. Each material has explicit source/reference
regions (box or polygon and/or HSV ranges, OpenCV units). Mask ownership must not overlap.
Maps LAB channel medians/spans within each material, preserving local light/shadow ordering.
Alpha, unselected pixels and near-black ink remain byte-identical. Outputs refuse overwrite.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from match_palette import robust_target, make_comparison

def region(image, spec):
    h,w = image.shape[:2]
    mask = Image.new('L',(w,h),0 if ('box' in spec or 'polygon' in spec) else 255)
    draw = ImageDraw.Draw(mask)
    if 'box' in spec:
        x0,y0,x1,y1 = spec['box']; draw.rectangle((x0,y0,x1-1,y1-1),fill=255)
    if 'polygon' in spec: draw.polygon([tuple(p) for p in spec['polygon']],fill=255)
    selected = np.asarray(mask)>0
    hsv = cv2.cvtColor(image[...,:3],cv2.COLOR_RGB2HSV)
    if 'hsv' in spec:
        selected &= np.all((hsv>=np.array(spec['hsv'][0])) & (hsv<=np.array(spec['hsv'][1])),axis=2)
    return selected & (image[...,3]>=192) & (hsv[...,2]>=45)

def transfer(source, reference, materials):
    src = cv2.cvtColor(source[...,:3],cv2.COLOR_RGB2LAB).astype(float)
    ref = cv2.cvtColor(reference[...,:3],cv2.COLOR_RGB2LAB).astype(float)
    result = source.copy(); owned = np.zeros(source.shape[:2],bool); report=[]
    for item in materials:
        sm,rm = region(source,item['source']),region(reference,item['reference'])
        if np.any(owned & sm): raise ValueError(f'Overlapping source material: {item["name"]}')
        if min(sm.sum(),rm.sum())<64: raise ValueError(f'Too few samples: {item["name"]}')
        owned |= sm
        weights = [item.get('lightness_strength',.45),item.get('chroma_strength',.85),item.get('chroma_strength',.85)]
        if any(not 0<=v<=1 for v in weights): raise ValueError('Strength must be in [0,1]')
        mapped=src.copy()
        for channel,weight in enumerate(weights):
            values=src[...,channel][sm]
            mapped[...,channel][sm]=values+(robust_target(values,values,ref[...,channel][rm])-values)*weight
        rgb=cv2.cvtColor(np.clip(mapped,0,255).astype(np.uint8),cv2.COLOR_LAB2RGB)
        result[sm,:3]=rgb[sm]
        report.append(dict(material=item['name'],source_pixels=int(sm.sum()),reference_pixels=int(rm.sum()),
            source_lab_median=np.median(src[sm],axis=0).tolist(),reference_lab_median=np.median(ref[rm],axis=0).tolist()))
    assert np.array_equal(source[...,3],result[...,3])
    assert np.array_equal(source[~owned],result[~owned])
    return result,dict(materials=report,alpha_identical=True,unselected_identical=True,
        changed_pixels=int(np.any(source[...,:3]!=result[...,:3],axis=2).sum()))

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('config',type=Path)
    args=parser.parse_args();config=json.loads(args.config.read_text(encoding='utf8'));base=args.config.resolve().parent
    reference_path=base/config['reference'];reference=np.asarray(Image.open(reference_path).convert('RGBA'))
    for job in config['parts']:
        source_path=base/job['source'];output=base/job['output']
        report_path=output.with_suffix('.report.json');comparison=output.with_suffix('.comparison.png')
        if any(p.exists() for p in (output,report_path,comparison)): raise SystemExit(f'Refusing to overwrite {output}')
        source=np.asarray(Image.open(source_path).convert('RGBA'))
        result,report=transfer(source,reference,job['materials'])
        output.parent.mkdir(parents=True,exist_ok=True);Image.fromarray(result).save(output)
        report.update(source=str(source_path),reference=str(reference_path),output=str(output))
        report_path.write_text(json.dumps(report,indent=2),encoding='utf8')
        make_comparison([reference_path,source_path,output],comparison,['PALETTE REFERENCE','BEFORE','MATERIAL MATCH'])
        print(output)
if __name__=='__main__': main()
