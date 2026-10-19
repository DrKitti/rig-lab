import { allKeys, copyPose, deleteKeys, FPS, keyBones, keyTimes, moveKeys, pastePose, snapTime, type KeyRef } from '../animEdit';
import type { EditorState } from '../state';
import { capture, h, value } from './dom';
import { boneSide } from './fields';

const LABEL_W = 132;
const RULER_H = 22;
const ROW_H = 20;
const PAD_R = 16;
const SIDE_CSS = { front: '#ff9a3c', back: '#5fa8ff', other: '#d8d6e2' } as const;

type Drag =
  | { kind: 'scrub' }
  | { kind: 'keys'; startX: number; refs: KeyRef[]; snapshot: string; moved: boolean };

/** Bottom panel in Animate mode: transport, key tools and a dope sheet (one row per keyed bone). */
export function mountTimeline(root: HTMLElement, state: EditorState): TimelineHandle {
  const canvas = h('canvas', { class: 'dope' });
  const wrap = h('div', { class: 'dope-wrap' }, canvas);
  const timeLabel = h('span', { class: 'time mono' });
  const playButton = h('button', { class: 'play', title: 'เล่น/หยุด (Space)', onclick: () => togglePlay() }, '▶');
  let scrollY = 0;
  let drag: Drag | null = null;

  const togglePlay = () => {
    if (!state.playing && state.time >= state.clip.duration && !state.clip.loop) state.setTime(0);
    state.setPlaying(!state.playing);
  };

  const jumpKey = (dir: 1 | -1) => {
    const times = keyTimes(state.clip);
    const t = state.time;
    const next = dir > 0 ? times.find((x) => x > t + 1e-4) : [...times].reverse().find((x) => x < t - 1e-4);
    state.setTime(next ?? (dir > 0 ? state.clip.duration : 0));
  };

  /** Keys the selected bone, or every bone when nothing is selected. */
  const keySelection = () => {
    const bone = state.selectedBone;
    const bones = bone ? [bone] : state.rig.bones.map((b) => b.name);
    state.edit(() => keyBones(state.clip, bones, state.time), true);
  };

  const toolbar = h(
    'div',
    { class: 'tl-bar' },
    h('button', { title: 'ไปต้นท่า', onclick: () => state.setTime(0) }, '⏮'),
    h('button', { title: 'คีย์ก่อนหน้า', onclick: () => jumpKey(-1) }, '◀◆'),
    playButton,
    h('button', { title: 'คีย์ถัดไป', onclick: () => jumpKey(1) }, '◆▶'),
    h(
      'select',
      { title: 'ความเร็ว', onchange: (e: Event) => (state.speed = Number(value(e))) },
      ...[0.1, 0.25, 0.5, 1].map((s) => h('option', { value: s, selected: s === 1 }, `${s}×`)),
    ),
    timeLabel,
    h('div', { class: 'spacer' }),
    h(
      'button',
      {
        class: 'accent',
        title: 'ใส่คีย์ค่าปัจจุบัน (K) — กระดูกที่เลือก หรือทุกกระดูกถ้าไม่ได้เลือก',
        onclick: () => keySelection(),
      },
      '◆ คีย์',
    ),
    h(
      'button',
      {
        title: 'ลบคีย์ที่เลือก (Delete)',
        onclick: () => deleteSelected(),
      },
      '🗑',
    ),
    h(
      'button',
      {
        title: 'คัดลอกท่าที่เวลานี้',
        onclick: () => {
          state.clipboard = copyPose(state.clip, state.time);
          state.toast('คัดลอกท่าแล้ว');
        },
      },
      '⧉ คัดลอก',
    ),
    h(
      'button',
      {
        title: 'วางท่าที่คัดลอกไว้ลงเวลานี้ (เฉพาะกระดูกที่เลือก ถ้าเลือกไว้)',
        onclick: () => {
          const pose = state.clipboard;
          if (!pose) return state.toast('ยังไม่ได้คัดลอกท่า', true);
          const bone = state.selectedBone;
          state.edit(() => pastePose(state.clip, state.time, pose, bone ? [bone] : undefined), true);
        },
      },
      '📋 วาง',
    ),
  );

  const deleteSelected = () => {
    if (state.selectedKeys.length === 0) return state.toast('ยังไม่ได้เลือกคีย์', true);
    const refs = state.selectedKeys;
    state.selectedKeys = [];
    state.edit(() => deleteKeys(state.clip, refs), true);
  };

  root.replaceChildren(toolbar, wrap);

  // ---------- Layout ----------

  /** Bones with keys, plus the selected bone; in hierarchy order. */
  const rows = (): string[] => {
    const keyed = new Set(Object.keys(state.clip.bones));
    const sel = state.selectedBone;
    return state.rig.bones.map((b) => b.name).filter((n) => keyed.has(n) || n === sel);
  };

  const trackWidth = () => canvas.clientWidth - LABEL_W - PAD_R;
  const xOf = (t: number) => LABEL_W + (t / state.clip.duration) * trackWidth();
  const tOf = (x: number) => ((x - LABEL_W) / trackWidth()) * state.clip.duration;
  const rowTop = (i: number) => RULER_H + (i + 1) * ROW_H - scrollY; // row 0 is the summary row

  // ---------- Drawing ----------

  const draw = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const hgt = wrap.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${hgt}px`;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const clip = state.clip;
    const names = rows();
    const selected = new Set(state.selectedKeys.map((k) => `${k.bone}|${k.time.toFixed(4)}`));

    // Rows
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textBaseline = 'middle';
    const drawRow = (i: number, label: string, color: string, times: number[], isSel: (t: number) => boolean, highlight: boolean) => {
      const y = rowTop(i);
      if (y + ROW_H < RULER_H || y > hgt) return;
      ctx.fillStyle = highlight ? '#2a2540' : i % 2 ? '#1a1724' : '#1d1a28';
      ctx.fillRect(0, y, w, ROW_H);
      ctx.fillStyle = color;
      ctx.fillText(label, 10, y + ROW_H / 2);
      for (const t of times) {
        const x = xOf(t);
        const s = isSel(t);
        ctx.save();
        ctx.translate(x, y + ROW_H / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = s ? '#ffc14d' : color;
        ctx.strokeStyle = '#0e0c14';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-4.5, -4.5, 9, 9);
        ctx.strokeRect(-4.5, -4.5, 9, 9);
        ctx.restore();
      }
    };

    const summaryTimes = keyTimes(clip);
    drawRow(-1, 'ทั้งหมด', '#e6e3ef', summaryTimes, (t) => names.some((n) => selected.has(`${n}|${t.toFixed(4)}`)), false);
    names.forEach((name, i) =>
      drawRow(i, name, SIDE_CSS[boneSide(name)], keyTimes(clip, [name]), (t) => selected.has(`${name}|${t.toFixed(4)}`), name === state.selectedBone),
    );
    if (names.length === 0) {
      ctx.fillStyle = '#8d88a3';
      ctx.fillText('ยังไม่มีคีย์ — ปรับค่ากระดูกหรือกด ◆ คีย์', LABEL_W + 8, rowTop(0) + ROW_H / 2);
    }

    // Ruler (drawn last so it stays on top when rows scroll)
    ctx.fillStyle = '#16131f';
    ctx.fillRect(0, 0, w, RULER_H);
    ctx.fillStyle = '#8d88a3';
    ctx.font = '10px system-ui, sans-serif';
    const step = clip.duration > 3 ? 0.5 : 0.1;
    for (let t = 0; t <= clip.duration + 1e-6; t += 1 / FPS) {
      const x = xOf(t);
      const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
      ctx.fillStyle = major ? '#4a4560' : '#2a2638';
      ctx.fillRect(x, major ? 10 : 16, 1, major ? 12 : 6);
      if (major) {
        ctx.fillStyle = '#8d88a3';
        ctx.fillText(`${(Math.round(t * 100) / 100).toString()}s`, x + 3, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, RULER_H, 1, hgt);
      }
    }
    ctx.fillStyle = '#16131f';
    ctx.fillRect(0, 0, LABEL_W - 4, RULER_H);
    ctx.fillStyle = '#8d88a3';
    ctx.fillText(`${Math.round(clip.duration * FPS)} เฟรม · ${FPS} fps`, 10, RULER_H / 2);

    // Playhead
    const px = xOf(state.time);
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(px - 1, 0, 2, hgt);
    ctx.beginPath();
    ctx.moveTo(px - 6, 0);
    ctx.lineTo(px + 6, 0);
    ctx.lineTo(px, 8);
    ctx.fill();

    timeLabel.textContent = `${state.time.toFixed(2)} / ${clip.duration.toFixed(2)}s · เฟรม ${Math.round(state.time * FPS)}`;
    playButton.textContent = state.playing ? '⏸' : '▶';
  };

  // ---------- Interaction ----------

  /** Key diamond under a point: the summary row returns every shown key at that time. */
  const hitKey = (x: number, y: number): KeyRef[] | null => {
    if (y < RULER_H || x < LABEL_W - 6) return null;
    const names = rows();
    const i = Math.floor((y + scrollY - RULER_H) / ROW_H) - 1;
    if (i < -1 || i >= names.length) return null;
    const clip = state.clip;
    const bones = i === -1 ? Object.keys(clip.bones) : [names[i]];
    const times = keyTimes(clip, bones);
    const t = times.find((tt) => Math.abs(xOf(tt) - x) <= 6);
    if (t === undefined) return null;
    return allKeys(clip, bones).filter((k) => Math.abs(k.time - t) < 1e-4);
  };

  const labelAt = (x: number, y: number): string | null => {
    if (x >= LABEL_W || y < RULER_H) return null;
    const i = Math.floor((y + scrollY - RULER_H) / ROW_H) - 1;
    return rows()[i] ?? null;
  };

  const sameKey = (a: KeyRef, b: KeyRef) => a.bone === b.bone && a.channel === b.channel && Math.abs(a.time - b.time) < 1e-4;

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    capture(canvas, e);
    if (state.playing) state.setPlaying(false);

    const label = labelAt(x, y);
    if (label) return state.select({ kind: 'bone', name: label });

    const hit = hitKey(x, y);
    if (hit) {
      let sel = state.selectedKeys;
      const allSelected = hit.every((k) => sel.some((s) => sameKey(s, k)));
      if (e.shiftKey) sel = allSelected ? sel.filter((s) => !hit.some((k) => sameKey(s, k))) : [...sel, ...hit];
      else if (!allSelected) sel = hit;
      state.selectedKeys = sel;
      state.setTime(hit[0].time);
      state.structureChanged();
      drag = { kind: 'keys', startX: x, refs: sel, snapshot: JSON.stringify(state.clip.bones), moved: false };
      return;
    }

    if (!e.shiftKey && state.selectedKeys.length) {
      state.selectedKeys = [];
      state.structureChanged();
    }
    drag = { kind: 'scrub' };
    state.setTime(snapTime(tOf(x)));
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (drag.kind === 'scrub') return state.setTime(snapTime(tOf(x)));
    const dt = Math.round(((x - drag.startX) / trackWidth()) * state.clip.duration * FPS) / FPS;
    if (dt === 0 && !drag.moved) return;
    if (!drag.moved) {
      state.checkpoint();
      drag.moved = true;
    }
    // Re-apply from the drag-start copy so passing over other keys doesn't eat them.
    const clip = state.clip;
    clip.bones = JSON.parse(drag.snapshot);
    state.selectedKeys = moveKeys(clip, drag.refs, dt);
    state.setTime(state.selectedKeys[0]?.time ?? state.time);
  });

  const end = () => {
    if (drag?.kind === 'keys' && drag.moved) state.structureChanged();
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('wheel', (e) => {
    const max = Math.max(0, RULER_H + (rows().length + 1) * ROW_H - wrap.clientHeight);
    scrollY = Math.max(0, Math.min(max, scrollY + e.deltaY));
    e.preventDefault();
    draw();
  });

  new ResizeObserver(draw).observe(wrap);
  state.onChange(draw);

  const render = () => {
    root.hidden = state.mode !== 'animate';
    draw();
  };
  state.onStructure(render);
  render();

  return { togglePlay, deleteSelected, jumpKey, keySelection };
}

/** Timeline actions used by keyboard shortcuts. */
export interface TimelineHandle {
  togglePlay(): void;
  deleteSelected(): void;
  jumpKey(dir: 1 | -1): void;
  keySelection(): void;
}
