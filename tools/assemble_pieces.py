"""Fit the placed pieces to the rig, assemble the rest pose and compare (pipeline step 4).

Usage: python tools/assemble_pieces.py <fullbody.png> <placed_dir> <out_dir> [--fix-arms]
Arms stay exactly where they were drawn (the rig's arm bones follow them, see
build_rig_from_pieces.py); --fix-arms instead snaps each fist onto B7's arms-down spec.
The leg fix always runs, so the legs sit on the rig's hips and ground.
<placed_dir> holds the pieces from fit_pieces.py (full-body scale) + placement.json.
Joint fixes, all in full-body px (= rig units), only where a joint is off by > 5 px:
  - arms: one similarity transform about the spec SHOULDER that puts the drawn fist
    centre (gauntlet centroid) on the spec fist centre (reported as scale/rotation);
  - leg: stood upright (a weak fit can tilt it) and its width matched to the full body's near
    leg at the shin, then a translation that puts the leg centre line and the sole on the spec, then a
    vertical remap of the thigh only (top of leg .. THIGH_END) so the dome centre lands
    on the spec hip; the knee, greave and sabaton keep their pixels.
Then the rest pose is assembled in rig draw order (far arm, far leg, near leg, torso,
head, near arm; far parts tinted #C9C3DA, far leg = the leg moved to the far hip), the
silhouette IoU against the full body is printed, and preview.png is written.
Writes the final pieces, pieces.json (canvas, pivot and joint points per piece, in the
piece's own px) and preview.png. Only numpy + Pillow + OpenCV (local); no network.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from pipeline_frame import load_frame
from build_rig_from_pieces import find_fist

SPEC = {'neck': (340, 490), 'sh_F': (265, 580), 'sh_B': (435, 560), 'el_F': (228, 707), 'el_B': (478, 687),
        'fist_F': (190, 834), 'fist_B': (521, 813), 'hip_F': (306, 781), 'hip_B': (427, 781),
        'hip': (359, 888), 'knee_F': (306, 950), 'knee_B': (427, 950), 'sole': 1119}
THIGH_END = 880  # rows above this (full-body px) may be remapped on the leg
LEG_WIDTH_AT = 110  # the leg width is matched to the full body this far above the sole (the shin)
TINT = np.array([0xC9, 0xC3, 0xDA]) / 255.0
FB = (671, 1164)
BASE_SPEC = dict(SPEC)


def load(p):
    return np.asarray(Image.open(p).convert('RGBA')).astype(np.float32)


def to_full(img, origin, pad=150):
    """Piece -> padded full-body canvas (premultiplied)."""
    W, H = FB[0] + 2 * pad, FB[1] + 2 * pad
    c = np.zeros((H, W, 4), np.float32)
    ox, oy = origin[0] + pad, origin[1] + pad
    h, w = img.shape[:2]
    pre = img.copy()
    pre[..., :3] *= pre[..., 3:4] / 255.0
    c[oy:oy + h, ox:ox + w] = pre
    return c


def unpre(c):
    o = c.copy()
    a = o[..., 3:4]
    with np.errstate(divide='ignore', invalid='ignore'):
        o[..., :3] = np.where(a > 0, o[..., :3] * 255.0 / a, 0)
    return np.clip(o, 0, 255)


def warp(c, M):
    return cv2.warpAffine(c, M, (c.shape[1], c.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def gauntlet_centroid(c, pad):
    u = unpre(c)
    r, g, b, a = (u[..., i] for i in range(4))
    m = (a > 128) & (r > 90) & (r > g + 35)
    m[: 700 + pad] = False
    ys, xs = np.where(m)
    return xs.mean() - pad, ys.mean() - pad


def crop(c, pad, margin=6):
    ys, xs = np.where(c[..., 3] > 8)
    x0, y0 = xs.min() - margin, ys.min() - margin
    x1, y1 = xs.max() + margin + 1, ys.max() + margin + 1
    return unpre(c[y0:y1, x0:x1]), (int(x0 - pad), int(y0 - pad))


def main():
    global SPEC, FB, THIGH_END
    args = [a for a in sys.argv[1:] if a != '--fix-arms']
    fix = '--fix-arms' in sys.argv
    full_p, placed, out = Path(args[0]), Path(args[1]), Path(args[2])
    out.mkdir(parents=True, exist_ok=True)
    pl = json.loads((placed / 'placement.json').read_text())
    frame = pl.get('_frame', load_frame(full_p))
    dx, dy = frame['offset']
    FB = tuple(frame['canvas'])
    SPEC = {key: (value[0] + dx, value[1] + dy) if isinstance(value, tuple) else value + dy
            for key, value in BASE_SPEC.items()}
    THIGH_END = 880 + dy
    pad = 150
    canv, report = {}, {}
    for name in ('head', 'torso', 'arm_F', 'arm_B', 'leg_F'):
        canv[name] = to_full(load(placed / f'{name}.png'), pl[name]['origin'], pad)

    for side in ('F', 'B'):
        name = f'arm_{side}'
        sh = np.array(SPEC[f'sh_{side}'], float)
        shoulder_px = [SPEC[f'sh_{side}'][0] - pl[name]['origin'][0],
                       SPEC[f'sh_{side}'][1] - pl[name]['origin'][1]]
        fist_px = find_fist(str(placed / f'{name}.png'), shoulder_px)
        f_now = np.array(fist_px) + pl[name]['origin']
        f_spec = np.array(SPEC[f'fist_{side}'], float)
        v0, v1 = f_now - sh, f_spec - sh
        k = complex(*v1) / complex(*v0)
        s, ang = abs(k), np.degrees(np.angle(k))
        off = float(np.hypot(*(f_now - f_spec)))
        if off > 5 and fix:
            M = cv2.getRotationMatrix2D((sh[0] + pad, sh[1] + pad), -ang, s)
            canv[name] = warp(canv[name], M)
        f_new = f_spec if off > 5 and fix else f_now
        report[name] = dict(fist_before=[round(f_now[0], 1), round(f_now[1], 1)], fist_off_before=round(off, 1),
                            fix=dict(scale=round(s, 4), rotation_deg=round(ang, 2)) if off > 5 and fix else None,
                            fist_after=[round(f_new[0], 1), round(f_new[1], 1)])

    # leg: first stand it upright and match the full body's leg width (a weak fit can leave it
    # tilted or too small), then translate centre line + sole, then remap the thigh so the dome
    # centre is on the hip
    fb_alpha = np.asarray(Image.open(full_p).convert('RGBA'))[..., 3] > 128
    u = unpre(canv['leg_F'])
    op = u[..., 3] > 128
    ys, xs = np.where(op)
    top, bot = ys.min(), ys.max()
    def centre(y):
        row = np.where(op[int(y)])[0]
        return (row.min() + row.max()) / 2
    y1, y2 = top + (bot - top) * 0.15, top + (bot - top) * 0.6  # thigh and shin, above the foot
    tilt = float(np.degrees(np.arctan2(centre(y2) - centre(y1), y2 - y1)))
    if abs(tilt) > 1:
        cxt = centre(top + 5)
        canv['leg_F'] = warp(canv['leg_F'], cv2.getRotationMatrix2D((float(cxt), float(top)), -tilt, 1.0))
    # width: compare at the shin, LEG_WIDTH_AT units above the sole
    u = unpre(canv['leg_F'])
    op = u[..., 3] > 128
    ys, xs = np.where(op)
    bot = ys.max()
    prow = np.where(op[bot - LEG_WIDTH_AT])[0]
    piece_w = prow.max() - prow.min()
    fy = SPEC['sole'] - LEG_WIDTH_AT
    fxs = np.where(fb_alpha[fy])[0]
    runs = [r for r in np.split(fxs, np.where(np.diff(fxs) > 1)[0] + 1) if len(r) > 10]
    near = min(runs, key=lambda r: abs((r.min() + r.max()) / 2 - SPEC['hip_F'][0]))
    fb_w = near.max() - near.min()
    widen = float(np.clip(fb_w / piece_w, 0.8, 1.25))
    if near.min() < SPEC['hip_F'][0] < SPEC['hip_B'][0] < near.max():
        # the two legs touch at this row, so the run is both legs: keep the fitted width
        print(f'WARNING leg: full-body legs touch at the shin ({fb_w} px run); width not matched')
        widen = 1.0
    if abs(widen - 1) > 0.03:
        cxw = (prow.min() + prow.max()) / 2
        canv['leg_F'] = warp(canv['leg_F'], np.float32([[widen, 0, cxw * (1 - widen)], [0, 1, 0]]))
    leg_fix = dict(tilt_fixed_deg=round(tilt, 2), width_scale=round(widen, 3), piece_width=int(piece_w), fullbody_width=int(fb_w))
    print(f'leg: stood upright ({tilt:+.1f} deg), width x{widen:.2f} ({piece_w} -> full body {fb_w} at the shin)')
    u = unpre(canv['leg_F'])
    op = u[..., 3] > 128
    ys, xs = np.where(op)
    top, sole = ys.min() - pad, ys.max() - pad
    row = np.where(op[top + pad + 40])[0]
    cx, half = (row.min() + row.max()) / 2 - pad, (row.max() - row.min()) / 2
    dx, dy = SPEC['hip_F'][0] - cx, SPEC['sole'] - sole
    canv['leg_F'] = warp(canv['leg_F'], np.float32([[1, 0, dx], [0, 1, dy]]))
    top2 = top + dy
    dome_now = top2 + half
    want_top = SPEC['hip_F'][1] - half
    Hc = canv['leg_F'].shape[0]
    yo = np.arange(Hc, dtype=np.float32) - pad
    ki = [-1e5, top2, THIGH_END, 1e5]
    ko = [-1e5 + (want_top - top2), want_top, THIGH_END, 1e5]
    yi = np.interp(yo, ko, ki).astype(np.float32) + pad
    mapx = np.tile(np.arange(canv['leg_F'].shape[1], dtype=np.float32), (Hc, 1))
    mapy = np.repeat(yi[:, None], canv['leg_F'].shape[1], axis=1)
    canv['leg_F'] = cv2.remap(canv['leg_F'], mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    report['leg_F'] = dict(**leg_fix, centre_x_before=round(cx, 1), sole_before=int(sole), translate=[round(dx, 1), int(dy)],
                           dome_centre_y_before=round(dome_now, 1), thigh_remap=f'rows {top2:.0f}..{THIGH_END} -> {want_top:.0f}..{THIGH_END}',
                           dome_radius=round(half, 1))

    # final pieces + pivots in piece px
    pieces = {'_frame': frame}
    for name in ('head', 'torso', 'arm_F', 'arm_B', 'leg_F'):
        img, origin = crop(canv[name], pad)
        Image.fromarray(img.round().astype(np.uint8)).save(out / f'{name}.png')
        ox, oy = origin
        pt = lambda p: [round(p[0] - ox, 1), round(p[1] - oy, 1)]
        info = dict(canvas=[img.shape[1], img.shape[0]], origin_in_fullbody=[ox, oy])
        if name == 'head':
            info['pivot_neck'] = pt(SPEC['neck'])
        elif name == 'torso':
            info.update(pivot_hip=pt(SPEC['hip']), neck=pt(SPEC['neck']), shoulder_F=pt(SPEC['sh_F']),
                        shoulder_B=pt(SPEC['sh_B']), dome_F=pt(SPEC['hip_F']), dome_B=pt(SPEC['hip_B']))
        elif name.startswith('arm'):
            sd = name[-1]
            info.update(pivot_shoulder=pt(SPEC[f'sh_{sd}']), elbow=pt(SPEC[f'el_{sd}']), fist=pt(SPEC[f'fist_{sd}']),
                        **report[name])
        else:
            info.update(pivot_dome=pt(SPEC['hip_F']), knee=pt(SPEC['knee_F']), sole_y=SPEC['sole'] - oy,
                        far_leg_offset=[SPEC['hip_B'][0] - SPEC['hip_F'][0], 0], **report['leg_F'])
        pieces[name] = info
        canv[name + '_crop'] = (img, origin)
    (out / 'pieces.json').write_text(json.dumps(pieces, indent=2))

    # assemble the rest pose
    asm = Image.new('RGBA', FB, (0, 0, 0, 0))

    def put(name, dx=0, tint=False):
        img, (ox, oy) = canv[name + '_crop']
        a = img.copy()
        if tint:
            a[..., :3] *= TINT
        asm.alpha_composite(Image.fromarray(a.round().astype(np.uint8)), (0, 0), None) if False else None
        layer = Image.new('RGBA', FB, (0, 0, 0, 0))
        layer.paste(Image.fromarray(a.round().astype(np.uint8)), (ox + dx, oy))
        asm.alpha_composite(layer)

    put('arm_B')
    put('leg_F', dx=SPEC['hip_B'][0] - SPEC['hip_F'][0])
    put('leg_F')
    put('torso')
    put('head')
    put('arm_F')
    asm.save(out / 'assembled.png')
    fullimg = Image.open(full_p).convert('RGBA')
    A = np.asarray(asm)[..., 3] > 128
    F = np.asarray(fullimg)[..., 3] > 128
    iou = (A & F).sum() / (A | F).sum()
    Ab, Fb = A.copy(), F.copy()
    Ab[:470], Fb[:470] = False, False
    iou_b = (Ab & Fb).sum() / (Ab | Fb).sum()
    print(f'assembled vs full body: silhouette IoU {iou:.3f} (whole), {iou_b:.3f} (below the neck)')

    # dome cover: leg pixels above the tasset hem must be under the torso
    tor = np.zeros(FB[::-1], bool)
    img, (ox, oy) = canv['torso_crop']
    tor[oy:oy + img.shape[0], ox:ox + img.shape[1]] = img[..., 3] > 128
    leg_img, (lx, ly) = canv['leg_F_crop']
    for dxx, nm in ((0, 'near'), (SPEC['hip_B'][0] - SPEC['hip_F'][0], 'far')):
        legm = np.zeros(FB[::-1], bool)
        legm[ly:ly + leg_img.shape[0], lx + dxx:lx + dxx + leg_img.shape[1]] = leg_img[..., 3] > 128
        dome = legm.copy()
        dome[SPEC['hip_F'][1] + 1:] = False  # the dome cap = leg above the hip pivot row
        print(f'{nm} leg dome cap: {dome.sum()} px, uncovered by the torso: {(dome & ~tor).sum()} px')

    # preview: full body | assembled | overlay difference | pieces
    full_bg = Image.new('RGBA', FB, (40, 40, 48, 255))
    full_bg.alpha_composite(fullimg)
    asm_bg = Image.new('RGBA', FB, (40, 40, 48, 255))
    asm_bg.alpha_composite(asm)
    diff = np.zeros((FB[1], FB[0], 4), np.uint8)
    diff[..., 3] = 255
    diff[F & ~A] = (255, 80, 80, 255)
    diff[A & ~F] = (80, 160, 255, 255)
    diff[A & F] = (90, 90, 100, 255)
    dimg = Image.fromarray(diff)
    d = ImageDraw.Draw(dimg)
    for key, p in SPEC.items():
        if key != 'sole':
            d.ellipse((p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5), outline=(255, 230, 0), width=2)
    d.line((0, SPEC['sole'], FB[0], SPEC['sole']), fill=(255, 230, 0))
    tiles = [full_bg, asm_bg, dimg]
    for name in ('head', 'torso', 'arm_F', 'arm_B', 'leg_F'):
        img = Image.open(out / f'{name}.png').convert('RGBA')
        bg = Image.new('RGBA', img.size, (40, 40, 48, 255))
        bg.alpha_composite(img)
        tiles.append(bg)
    W = sum(t.width for t in tiles) + 20 * (len(tiles) + 1)
    H = max(t.height for t in tiles) + 40
    sheet = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    x = 20
    for t in tiles:
        sheet.paste(t, (x, 20))
        x += t.width + 20
    sheet.save(out / 'preview.png')
    print(json.dumps(pieces, indent=1))


if __name__ == '__main__':
    main()
