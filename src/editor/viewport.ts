import { Application, Container, Graphics, Point } from 'pixi.js';
import { sampleClip } from '../rig/core/animation';
import { apply, invert, normalizeAngle } from '../rig/core/math';
import { loadRigTextures, SkeletonView, type RigTextures } from '../rig/pixi/SkeletonView';
import type { Pose } from '../rig/core/types';
import { keyTimes, setKey } from './animEdit';
import { activeIk, aimBone, findPart, moveBone, movePart } from './rigEdit';
import type { EditorState } from './state';
import { boneSide, SIDE_COLOR } from './ui/fields';
import { capture, h } from './ui/dom';

const HANDLE = 9;
const PICK = 12;
const SELECTED = 0xffc14d;
const PIVOT = 0xff4d8d;

type Drag =
  | { kind: 'rotate'; bone: string; start: number; startAngle: number }
  | { kind: 'translate'; bone: string; dx: number; dy: number }
  | { kind: 'aim'; bone: string }
  | { kind: 'movePart'; part: string; dx: number; dy: number }
  | { kind: 'pan'; sx: number; sy: number; px: number; py: number };

/**
 * PixiJS viewport. Setup mode edits the skeleton (always shown in the setup pose);
 * Animate mode keys bone rotation/translation at the playhead.
 */
export class Viewport {
  private app = new Application();
  private world = new Container();
  private view!: SkeletonView;
  private ghosts: SkeletonView[] = [];
  private overlay = new Graphics();
  private assets!: RigTextures;
  private drag: Drag | null = null;
  private dragMoved = false;
  private needsRender = true;
  private fitHeight = 1000;
  private pan = { x: 0, y: 0 };
  private spaceDown = false;

  constructor(private readonly state: EditorState) {}

  async mount(host: HTMLElement): Promise<void> {
    await this.app.init({ resizeTo: host, background: '#14121c', antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });
    host.prepend(this.app.canvas);
    this.assets = await loadRigTextures(this.state.rig, '/', true);

    this.ghosts = [new SkeletonView(this.state.rig, this.assets), new SkeletonView(this.state.rig, this.assets)];
    this.ghosts[0].alpha = this.ghosts[1].alpha = 0.28;
    this.ghosts[0].tint = 0x7fa8ff;
    this.ghosts[1].tint = 0x8dff9a;
    this.view = new SkeletonView(this.state.rig, this.assets);
    this.world.addChild(...this.ghosts, this.view);
    this.app.stage.addChild(this.world, this.overlay);

    this.view.update();
    this.fitHeight = this.measureHeight();
    this.bindInput();
    this.state.onChange(() => (this.needsRender = true));
    this.state.onStructure(() => {
      this.needsRender = true;
      void this.ensureTextures();
    });
    this.app.renderer.on('resize', () => (this.needsRender = true));

    this.app.ticker.add((ticker) => {
      const st = this.state;
      if (st.playing && st.mode === 'animate') {
        let t = st.time + (ticker.deltaMS / 1000) * st.speed;
        if (t >= st.clip.duration) {
          if (st.clip.loop) t %= st.clip.duration || 1;
          else {
            t = st.clip.duration;
            st.setPlaying(false);
          }
        }
        st.setTime(t);
      }
      if (this.needsRender) {
        this.needsRender = false;
        this.render();
      }
    });
  }

  partSize(name: string) {
    return this.view?.partSize(name) ?? null;
  }

  zoomToFit(): void {
    this.state.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.state.changed();
  }

  /** Loads textures added by an import. */
  private async ensureTextures(): Promise<void> {
    const missing = Object.keys(this.state.rig.textures).some((k) => !this.assets.textures.has(k));
    if (!missing) return;
    const more = await loadRigTextures(this.state.rig, '/', true);
    for (const [k, v] of more.textures) this.assets.textures.set(k, v);
    for (const [k, v] of more.alpha) this.assets.alpha.set(k, v);
    this.needsRender = true;
  }

  private measureHeight(): number {
    let top = 0;
    for (const bone of this.state.rig.bones) top = Math.min(top, this.view.skeleton.tip(bone.name).y, this.view.skeleton.origin(bone.name).y);
    return Math.max(300, this.state.rig.groundY - top + 80);
  }

  private get animating(): boolean {
    return this.state.mode === 'animate';
  }

  // ---------- Rendering ----------

  private render(): void {
    const st = this.state;
    const { width, height } = this.app.screen;
    const s = ((height * 0.78) / this.fitHeight) * st.zoom;
    this.world.position.set(width / 2 + this.pan.x, height * 0.86 + this.pan.y);
    this.world.scale.set(st.view.flip ? -s : s, s);

    const clip = st.clip;
    const rootShift = this.animating && st.view.rootMotion && clip.duration > 0 ? ((clip.rootMotion ?? 0) * st.time) / clip.duration : 0;
    for (const v of [this.view, ...this.ghosts]) v.position.set(rootShift, -st.rig.groundY);

    this.view.visible = st.view.parts;
    // IK only while animating; Setup mode edits the bones freely.
    this.view.skeleton.ikEnabled = this.animating;
    this.view.update(this.animating || !st.view.drawn ? st.pose() : this.drawnPose());

    // Onion skin: the nearest keyed poses before and after the playhead.
    const times = this.animating && st.view.onion ? keyTimes(clip) : [];
    const prev = [...times].reverse().find((t) => t < st.time - 1e-4);
    const next = times.find((t) => t > st.time + 1e-4);
    const ghostAt = (g: SkeletonView, t: number | undefined) => {
      g.visible = t !== undefined && st.view.parts;
      if (t !== undefined) g.update(sampleClip(clip, t));
    };
    ghostAt(this.ghosts[0], prev);
    ghostAt(this.ghosts[1], next);

    this.drawOverlay();
  }

  /** Setup-mode view of the bones turned back to their drawn angles (see BoneData.drawnRotation). */
  private drawnPose(): Pose {
    const pose: Pose = {};
    for (const b of this.state.rig.bones) if (b.drawnRotation !== undefined) pose[b.name] = { rotate: b.drawnRotation - b.rotation };
    return pose;
  }

  /** Rig space → screen. */
  private screen(x: number, y: number): { x: number; y: number } {
    return this.view.toGlobal(new Point(x, y));
  }

  /** Screen → rig space. */
  private rigPoint(x: number, y: number): { x: number; y: number } {
    return this.view.toLocal(new Point(x, y));
  }

  private drawOverlay(): void {
    const g = this.overlay.clear();
    const st = this.state;
    const sk = this.view.skeleton;
    const { width } = this.app.screen;

    const ground = this.screen(0, st.rig.groundY);
    g.moveTo(0, ground.y).lineTo(width, ground.y).stroke({ width: 2, color: 0x3a3550 });

    if (st.selection?.kind === 'part') this.drawPartOutline(st.selection.name);

    if (st.view.bones) {
      for (const bone of st.rig.bones) {
        const selected = st.selection?.kind === 'bone' && st.selection.name === bone.name;
        const a = this.screen(sk.origin(bone.name).x, sk.origin(bone.name).y);
        if (!bone.parent) {
          g.rect(a.x - 9, a.y - 9, 18, 18).stroke({ width: 2, color: selected ? SELECTED : 0xffffff });
          continue;
        }
        const color = selected ? SELECTED : SIDE_COLOR[boneSide(bone.name)];
        const tip = sk.tip(bone.name);
        const b = this.screen(tip.x, tip.y);
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = (-(b.y - a.y) / len) * 7;
        const ny = ((b.x - a.x) / len) * 7;
        g.poly([a.x + nx, a.y + ny, a.x - nx, a.y - ny, b.x, b.y]).fill({ color, alpha: selected ? 0.9 : 0.45 });
        g.circle(a.x, a.y, 7).stroke({ width: 2, color });
        if (selected) {
          // Handles: □ = move origin (Setup) / translate (Animate); ● = aim + stretch (Setup only).
          g.rect(a.x - HANDLE, a.y - HANDLE, HANDLE * 2, HANDLE * 2).stroke({ width: 2, color: SELECTED });
          g.circle(b.x, b.y, this.animating ? 4 : 7).fill({ color: SELECTED });
        } else {
          g.circle(b.x, b.y, 3.5).fill({ color });
        }
      }
    }

    if (st.view.mesh) {
      for (const part of st.rig.parts) {
        const mesh = this.view.meshOf(part.name);
        if (!mesh) continue;
        const { positions: p, indices: idx } = mesh;
        const pt = (i: number) => this.screen(p[i * 2], p[i * 2 + 1]);
        for (let t = 0; t < idx.length; t += 3) {
          const a = pt(idx[t]);
          const b = pt(idx[t + 1]);
          const c = pt(idx[t + 2]);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c.x, c.y).lineTo(a.x, a.y);
        }
        g.stroke({ width: 1, color: 0x7fffd4, alpha: 0.6 });
      }
    }

    if (st.view.pivots) {
      for (const part of st.rig.parts) {
        const m = sk.partMatrix(part);
        const p = this.screen(m.tx, m.ty);
        g.moveTo(p.x - 8, p.y).lineTo(p.x + 8, p.y).moveTo(p.x, p.y - 8).lineTo(p.x, p.y + 8).stroke({ width: 2, color: PIVOT });
      }
    }
  }

  private drawPartOutline(name: string): void {
    const part = this.state.rig.parts.find((p) => p.name === name);
    const size = this.view.partSize(name);
    if (!part || !size) return;
    const m = this.view.skeleton.partMatrix(part);
    const pts = [
      [0, 0],
      [size.width, 0],
      [size.width, size.height],
      [0, size.height],
    ].flatMap(([cx, cy]) => {
      const p = apply(m, cx - part.originX * size.width, cy - part.originY * size.height);
      const s = this.screen(p.x, p.y);
      return [s.x, s.y];
    });
    this.overlay.poly(pts).stroke({ width: 2, color: SELECTED, alpha: 0.9 });
    const pivot = this.screen(m.tx, m.ty);
    this.overlay.circle(pivot.x, pivot.y, 5).fill({ color: PIVOT });
  }

  // ---------- Input ----------

  private bindInput(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    const end = () => {
      if (this.drag && this.drag.kind !== 'pan' && this.dragMoved) this.state.structureChanged();
      this.drag = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.state.zoom = Math.max(0.2, Math.min(6, this.state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        this.state.changed();
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) this.spaceDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.spaceDown = false;
    });
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Angle of a rig-space point around a bone's origin, in rig space (so flipping the view doesn't invert drags). */
  private angleAround(bone: string, p: { x: number; y: number }): number {
    const o = this.view.skeleton.origin(bone);
    return (Math.atan2(p.y - o.y, p.x - o.x) * 180) / Math.PI;
  }

  private pickBone(sx: number, sy: number): string | null {
    const sk = this.view.skeleton;
    let best: string | null = null;
    let bestD = PICK;
    for (const bone of this.state.rig.bones) {
      const a = this.screen(sk.origin(bone.name).x, sk.origin(bone.name).y);
      if (!bone.parent) {
        if (Math.hypot(sx - a.x, sy - a.y) <= PICK) return bone.name;
        continue;
      }
      const tip = sk.tip(bone.name);
      const b = this.screen(tip.x, tip.y);
      const d = distanceToSegment(sx, sy, a.x, a.y, b.x, b.y, 0.15);
      if (d < bestD) {
        bestD = d;
        best = bone.name;
      }
    }
    return best;
  }

  private onDown(e: PointerEvent): void {
    const st = this.state;
    const p = this.local(e);
    const rp = this.rigPoint(p.x, p.y);
    const sk = this.view.skeleton;
    this.dragMoved = false;
    capture(this.app.canvas, e);
    if (st.playing) st.setPlaying(false);

    if (e.button === 1 || e.button === 2 || this.spaceDown) {
      this.drag = { kind: 'pan', sx: p.x, sy: p.y, px: this.pan.x, py: this.pan.y };
      return;
    }

    const sel = st.selection;
    if (sel?.kind === 'bone' && st.view.bones) {
      const o = sk.origin(sel.name);
      const os = this.screen(o.x, o.y);
      const tip = sk.tip(sel.name);
      const ts = this.screen(tip.x, tip.y);
      if (!this.animating && sk.bone(sel.name).parent && Math.hypot(p.x - ts.x, p.y - ts.y) <= PICK) {
        this.drag = { kind: 'aim', bone: sel.name };
        return;
      }
      if (Math.abs(p.x - os.x) <= HANDLE + 2 && Math.abs(p.y - os.y) <= HANDLE + 2) {
        this.drag = { kind: 'translate', bone: sel.name, dx: o.x - rp.x, dy: o.y - rp.y };
        return;
      }
    }

    if (st.view.bones) {
      let bone = this.pickBone(p.x, p.y);
      // A bone driven by IK is posed through its target (e.g. grab the shin, move the foot).
      if (bone && this.animating) bone = activeIk(st.rig, bone)?.target ?? bone;
      if (bone) {
        st.select({ kind: 'bone', name: bone });
        const o = sk.origin(bone);
        if (!sk.bone(bone).parent) {
          this.drag = { kind: 'translate', bone, dx: o.x - rp.x, dy: o.y - rp.y };
        } else {
          const start = this.animating ? (st.pose()[bone]?.rotate ?? 0) : sk.bone(bone).rotation;
          this.drag = { kind: 'rotate', bone, start, startAngle: this.angleAround(bone, rp) };
        }
        return;
      }
    }

    const part = st.view.parts ? this.view.partAt(rp.x, rp.y) : null;
    if (part) {
      if (this.animating) {
        // Dragging art in Animate mode poses the bone it hangs on (or its IK target).
        const partBone = findPart(st.rig, part).bone;
        const bone = activeIk(st.rig, partBone)?.target ?? partBone;
        st.select({ kind: 'bone', name: bone });
        const o = sk.origin(bone);
        this.drag = sk.bone(bone).parent
          ? { kind: 'rotate', bone, start: st.pose()[bone]?.rotate ?? 0, startAngle: this.angleAround(bone, rp) }
          : { kind: 'translate', bone, dx: o.x - rp.x, dy: o.y - rp.y };
        return;
      }
      st.select({ kind: 'part', name: part });
      const m = sk.partMatrix(findPart(st.rig, part));
      this.drag = { kind: 'movePart', part, dx: m.tx - rp.x, dy: m.ty - rp.y };
      return;
    }
    st.select(null);
  }

  private onMove(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    const st = this.state;
    const p = this.local(e);
    if (drag.kind === 'pan') {
      this.pan = { x: drag.px + p.x - drag.sx, y: drag.py + p.y - drag.sy };
      this.needsRender = true;
      return;
    }
    if (!this.dragMoved) {
      this.dragMoved = true;
      st.checkpoint();
    }
    const rp = this.rigPoint(p.x, p.y);
    const rig = st.rig;
    const clip = st.clip;

    switch (drag.kind) {
      case 'rotate': {
        const v = normalizeAngle(drag.start + this.angleAround(drag.bone, rp) - drag.startAngle);
        if (this.animating) setKey(clip, drag.bone, 'rotate', st.time, v);
        else rig.bones.find((b) => b.name === drag.bone)!.rotation = v;
        break;
      }
      case 'translate': {
        const x = rp.x + drag.dx;
        const y = rp.y + drag.dy;
        if (!this.animating) {
          moveBone(rig, drag.bone, Math.round(x), Math.round(y));
          break;
        }
        // Key the offset from the setup position, in the (posed) parent's space.
        const bone = this.view.skeleton.bone(drag.bone);
        const local = apply(invert(this.view.skeleton.parentWorld(drag.bone)), x, y);
        setKey(clip, drag.bone, 'x', st.time, local.x - bone.x);
        setKey(clip, drag.bone, 'y', st.time, local.y - bone.y);
        break;
      }
      case 'aim':
        aimBone(rig, drag.bone, rp.x, rp.y);
        break;
      case 'movePart':
        movePart(rig, drag.part, Math.round(rp.x + drag.dx), Math.round(rp.y + drag.dy));
        break;
    }
    st.changed();
  }

  /** Floating toolbar over the viewport. */
  mountToolbar(host: HTMLElement): void {
    const st = this.state;
    const bar = h('div', { class: 'vp-toolbar' });
    const legend = h(
      'div',
      { class: 'vp-legend' },
      h('span', { class: 'dot front' }),
      'หน้า',
      h('span', { class: 'dot back' }),
      'หลัง',
      h('span', { class: 'dot other' }),
      'อื่นๆ',
    );
    const toggle = (key: keyof typeof st.view, label: string, title: string, animateOnly = false) =>
      animateOnly && st.mode !== 'animate'
        ? null
        : h(
            'button',
            {
              class: st.view[key] ? 'on' : '',
              title,
              onclick: () => {
                st.view[key] = !st.view[key];
                st.structureChanged();
              },
            },
            label,
          );
    const zoom = h('input', {
      type: 'range',
      min: 0.2,
      max: 4,
      step: 0.05,
      title: 'ซูม (หรือหมุนล้อเมาส์)',
      oninput: (e: Event) => {
        st.zoom = Number((e.target as HTMLInputElement).value);
        st.changed();
      },
    });
    const render = () => {
      const items = [
        h(
          'div',
          { class: 'seg' },
          h('button', { class: st.mode === 'setup' ? 'on' : '', onclick: () => st.setMode('setup') }, '✎ Setup'),
          h('button', { class: st.mode === 'animate' ? 'on' : '', onclick: () => st.setMode('animate') }, '▶ Animate'),
        ),
        toggle('bones', '⟋ ข้อต่อ', 'แสดงกระดูก'),
        toggle('parts', '▣ ภาพ', 'แสดงภาพชิ้นส่วน'),
        toggle('pivots', '✛ Pivot', 'แสดงจุดหมุนของชิ้นส่วน'),
        toggle('mesh', '▦ Mesh', 'แสดงตาข่าย mesh ของชิ้นที่งอได้'),
        toggle('onion', '◌ Onion', 'เห็นท่าของคีย์ก่อนหน้า (ฟ้า) และถัดไป (เขียว)', true),
        toggle('rootMotion', '↦ Root motion', 'ให้ตัวละครเคลื่อนที่ไปข้างหน้าตามค่า root motion ของท่า', true),
        toggle('flip', '⇄ Flip', 'กลับซ้าย-ขวา'),
        st.mode === 'setup' && st.rig.bones.some((b) => b.drawnRotation !== undefined)
          ? toggle('drawn', '✍ ท่าที่วาด', 'สลับดูแขนท่ากางตามภาพเต็มตัว (ดูอย่างเดียว) · ปิด = ท่าพักแขนห้อย')
          : null,
        st.rig.ik.length === 0
          ? null
          : h(
              'button',
              {
                class: st.rig.ik.some((k) => (k.mix ?? 1) > 0) ? 'on' : '',
                title: 'IK: เท้าติดพื้น ลากเท้าหรือขาแล้วเข่างอเอง · ปิด = หมุนกระดูกทีละท่อนแบบเดิม',
                onclick: () => {
                  const on = st.rig.ik.some((k) => (k.mix ?? 1) > 0);
                  st.edit(() => st.rig.ik.forEach((k) => (k.mix = on ? 0 : 1)), true);
                },
              },
              '🦶 IK',
            ),
        h('span', { class: 'zoom' }, '🔍', zoom),
        h('button', { title: 'พอดีจอ', onclick: () => this.zoomToFit() }, '⤢'),
      ];
      bar.replaceChildren(...items.filter((x): x is HTMLElement => x !== null));
      zoom.value = String(st.zoom);
    };
    st.onStructure(render);
    st.onChange(() => {
      if (document.activeElement !== zoom) zoom.value = String(st.zoom);
    });
    render();
    host.append(bar, legend);
  }
}

/** Distance from a point to segment ab, skipping the first `skipStart` fraction near a. */
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number, skipStart: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(skipStart, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
