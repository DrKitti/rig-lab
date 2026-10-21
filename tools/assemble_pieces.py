"""Fit the placed pieces to the rig, assemble the rest pose and compare (pipeline step 4).

Usage: python tools/assemble_pieces.py <fullbody.png> <placed_dir> <out_dir> [--fix-arms] [--neutral-width]
Arms stay exactly where they were drawn (the rig's arm bones follow them, see
build_rig_from_pieces.py); --fix-arms instead snaps each fist onto B7's arms-down spec.
The leg fix always runs, so the legs sit on the rig's hips and ground. leg_B is optional;
when present it is fitted independently, otherwise the legacy path reuses leg_F.
<placed_dir> holds the pieces from fit_pieces.py (full-body scale) + placement.json.
Joint fixes, all in full-body px (= rig units), only where a joint is off by > 5 px:
  - arms: one similarity transform about the spec SHOULDER that puts the drawn fist
    centre (gauntlet centroid) on the spec fist centre (reported as scale/rotation);
  - each leg: stood upright (a weak fit can tilt it), its width reported against the full body
    without changing it, then translated so its centre line and sole land on the spec, then a
    vertical remap of the thigh only (top of leg .. THIGH_END) so the dome centre lands
    on the spec hip; the knee, greave and sabaton keep their pixels.
Then the rest pose is assembled in rig draw order (far arm, far leg, near leg, torso,
head, near arm; a separate far-leg texture is used when supplied), the
silhouette IoU against the full body is printed, and preview.png is written.
`--neutral-width` applies the neutral base's measured horizontal leg width at the
shin row; it is intended only for the fixed-width neutral scaffold.
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
    args = [a for a in sys.argv[1:] if a not in ('--fix-arms', '--neutral-width')]
    fix = '--fix-arms' in sys.argv
    neutral_width = '--neutral-width' in sys.argv
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
    separate_leg_B = 'leg_B' in pl and (placed / 'leg_B.png').exists()
    leg_names = ['leg_F', 'leg_B'] if separate_leg_B else ['leg_F']
    piece_names = ['head', 'torso', 'arm_F', 'arm_B', *leg_names]
    canv, report = {}, {}
    for name in piece_names:
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

    # Legs: stand each one upright, report width without changing the art, translate centre line
    # + sole, then remap only the hidden thigh top so the dome centre is on its own hip.
    fb_alpha = np.asarray(Image.open(full_p).convert('RGBA'))[..., 3] > 128
    fy = SPEC['sole'] - LEG_WIDTH_AT
    fxs = np.where(fb_alpha[fy])[0]
    runs = [r for r in np.split(fxs, np.where(np.diff(fxs) > 1)[0] + 1) if len(r) > 10]

    for name in leg_names:
        side = name[-1]
        u = unpre(canv[name])
        op = u[..., 3] > 128
        ys, xs = np.where(op)
        top, bot = ys.min(), ys.max()

        def centre(y):
            row = np.where(op[int(y)])[0]
            return (row.min() + row.max()) / 2

        y1, y2 = top + (bot - top) * 0.15, top + (bot - top) * 0.6
        tilt = float(np.degrees(np.arctan2(centre(y2) - centre(y1), y2 - y1)))
        if abs(tilt) > 1:
            cxt = centre(top + 5)
            canv[name] = warp(canv[name], cv2.getRotationMatrix2D((float(cxt), float(top)), -tilt, 1.0))

        u = unpre(canv[name])
        op = u[..., 3] > 128
        ys, xs = np.where(op)
        bot = ys.max()
        prow = np.where(op[bot - LEG_WIDTH_AT])[0]
        piece_w = int(prow.max() - prow.min())
        target_x = SPEC[f'hip_{side}'][0]
        full_run = min(runs, key=lambda r: abs((r.min() + r.max()) / 2 - target_x)) if runs else np.array([])
        fullbody_w = int(full_run.max() - full_run.min()) if len(full_run) else None
        joined = bool(len(full_run) and full_run.min() < SPEC['hip_F'][0] < SPEC['hip_B'][0] < full_run.max())
        suggested = None if joined or not fullbody_w else round(float(np.clip(fullbody_w / piece_w, 0.8, 1.25)), 3)
        if joined:
            print(f'WARNING {name}: full-body legs touch at the shin; width remains diagnostic')
        width_scale = 1.0
        if neutral_width and not joined and fullbody_w and piece_w:
            width_scale = fullbody_w / piece_w
            row_y = bot - LEG_WIDTH_AT
            row_xs = np.where(op[row_y])[0]
            if len(row_xs) and abs(width_scale - 1.0) > 0.001:
                cx0 = (row_xs.min() + row_xs.max()) / 2.0
                canv[name] = warp(canv[name], np.float32([[width_scale, 0, cx0 * (1 - width_scale)],
                                                           [0, 1, 0]]))
                u = unpre(canv[name])
                op = u[..., 3] > 128
                ys, xs = np.where(op)
                bot = ys.max()
                prow = np.where(op[bot - LEG_WIDTH_AT])[0]
                piece_w = int(prow.max() - prow.min())
        width_note = 'width locked' if neutral_width else 'width unchanged'
        print(f'{name}: stood upright ({tilt:+.1f} deg), {width_note} at {piece_w} px'
              + (f' (full-body row {fullbody_w} px)' if fullbody_w is not None else ''))

        top, sole = ys.min() - pad, ys.max() - pad
        row = np.where(op[top + pad + 40])[0]
        cx, half = (row.min() + row.max()) / 2 - pad, (row.max() - row.min()) / 2
        move_x, move_y = target_x - cx, SPEC['sole'] - sole
        canv[name] = warp(canv[name], np.float32([[1, 0, move_x], [0, 1, move_y]]))
        top2 = top + move_y
        dome_now = top2 + half
        want_top = SPEC[f'hip_{side}'][1] - half
        Hc = canv[name].shape[0]
        yo = np.arange(Hc, dtype=np.float32) - pad
        ki = [-1e5, top2, THIGH_END, 1e5]
        ko = [-1e5 + (want_top - top2), want_top, THIGH_END, 1e5]
        yi = np.interp(yo, ko, ki).astype(np.float32) + pad
        mapx = np.tile(np.arange(canv[name].shape[1], dtype=np.float32), (Hc, 1))
        mapy = np.repeat(yi[:, None], canv[name].shape[1], axis=1)
        canv[name] = cv2.remap(canv[name], mapx, mapy, cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        report[name] = dict(tilt_fixed_deg=round(tilt, 2), width_scale=round(width_scale, 4),
                            suggested_width_scale=suggested, piece_width=piece_w,
                            fullbody_width=fullbody_w, centre_x_before=round(cx, 1),
                            sole_before=int(sole), translate=[round(move_x, 1), int(move_y)],
                            dome_centre_y_before=round(dome_now, 1),
                            thigh_remap=f'rows {top2:.0f}..{THIGH_END} -> {want_top:.0f}..{THIGH_END}',
                            dome_radius=round(half, 1))

    # final pieces + pivots in piece px
    pieces = {'_frame': frame}
    for name in piece_names:
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
            side = name[-1]
            info.update(pivot_dome=pt(SPEC[f'hip_{side}']), knee=pt(SPEC[f'knee_{side}']),
                        sole_y=SPEC['sole'] - oy, **report[name])
            if name == 'leg_F' and not separate_leg_B:
                info['far_leg_offset'] = [SPEC['hip_B'][0] - SPEC['hip_F'][0], 0]
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
    if separate_leg_B:
        put('leg_B')
    else:
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
    checks = [('leg_F', 0, 'near')]
    checks += [('leg_B', 0, 'far')] if separate_leg_B else [
        ('leg_F', SPEC['hip_B'][0] - SPEC['hip_F'][0], 'far')]
    for leg_name, dxx, nm in checks:
        leg_img, (lx, ly) = canv[leg_name + '_crop']
        legm = np.zeros(FB[::-1], bool)
        legm[ly:ly + leg_img.shape[0], lx + dxx:lx + dxx + leg_img.shape[1]] = leg_img[..., 3] > 128
        dome = legm.copy()
        dome[SPEC[f'hip_{leg_name[-1]}'][1] + 1:] = False
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
    for name in piece_names:
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
