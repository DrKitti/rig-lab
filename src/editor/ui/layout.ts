import type { EditorState } from '../state';
import { capture, h } from './dom';

type Dock = 'left' | 'right' | 'bottom';
interface Layout { left: number; right: number; bottom: number; leftClosed: boolean; rightClosed: boolean; bottomClosed: boolean }
const KEY = 'riglab-layout-v2';

export function mountLayout(state: EditorState): void {
  const app = document.getElementById('app')!;
  const layout: Layout = { left: 220, right: 260, bottom: 180, leftClosed: false, rightClosed: false, bottomClosed: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Layout>;
    for (const key of ['left', 'right', 'bottom'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) layout[key] = saved[key]!;
    for (const key of ['leftClosed', 'rightClosed', 'bottomClosed'] as const) if (typeof saved[key] === 'boolean') layout[key] = saved[key]!;
  } catch { /* Optional local preferences. */ }
  const closedKey = (dock: Dock) => `${dock}Closed` as const;
  const apply = () => {
    layout.left = Math.max(160, Math.min(480, layout.left));
    layout.right = Math.max(180, Math.min(520, layout.right));
    layout.bottom = Math.max(120, Math.min(Math.max(120, window.innerHeight - 230), layout.bottom));
    let left = layout.leftClosed ? 32 : layout.left, right = layout.rightClosed ? 32 : layout.right;
    if (left + right > window.innerWidth - 300) { right = 32; if (left + right > window.innerWidth - 300) left = 32; }
    app.style.setProperty('--left-width', `${left}px`); app.style.setProperty('--right-width', `${right}px`);
    app.style.setProperty('--bottom-height', `${layout.bottomClosed ? 36 : layout.bottom}px`);
    for (const dock of ['left', 'right', 'bottom'] as const) {
      const closed = dock === 'left' ? left === 32 : dock === 'right' ? right === 32 : layout.bottomClosed;
      document.getElementById(`${dock}-panel`)!.classList.toggle('collapsed', closed);
      const button = document.getElementById(`toggle-${dock}`)!;
      button.textContent = dock === 'bottom' ? closed ? '▲' : '▼' : dock === 'left' ? closed ? '▶' : '◀' : closed ? '◀' : '▶';
      button.setAttribute('aria-label', `${closed ? 'ขยาย' : 'ย่อ'}แถบ${dock === 'left' ? 'ซ้าย' : dock === 'right' ? 'ขวา' : 'ล่าง'}`);
      button.setAttribute('aria-expanded', String(!closed));
      const grip = document.getElementById(`resize-${dock}`)!;
      grip.setAttribute('aria-valuenow', String(dock === 'left' ? left : dock === 'right' ? right : layout.bottom));
      grip.setAttribute('aria-valuemin', dock === 'bottom' ? '120' : '160');
      grip.setAttribute('aria-valuemax', dock === 'bottom' ? String(Math.max(120, window.innerHeight - 230)) : dock === 'left' ? '480' : '520');
      grip.setAttribute('aria-orientation', dock === 'bottom' ? 'horizontal' : 'vertical');
    }
  };
  let beforePreview: number | undefined;
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...layout, bottom: beforePreview ?? layout.bottom })); } catch { /* Optional. */ }
  };
  for (const dock of ['left', 'right', 'bottom'] as const) {
    const grip = document.getElementById(`resize-${dock}`)!;
    let drag: { x: number; y: number; size: number } | null = null;
    grip.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, size: layout[dock] };
      layout[closedKey(dock)] = false; capture(grip, e); e.preventDefault();
    });
    grip.addEventListener('pointermove', e => {
      if (!drag) return;
      layout[dock] = drag.size + (dock === 'left' ? e.clientX - drag.x : dock === 'right' ? drag.x - e.clientX : drag.y - e.clientY);
      apply();
    });
    const end = () => { if (drag) { drag = null; persist(); } };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
    grip.addEventListener('keydown', e => {
      if (!(dock === 'bottom' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']).includes(e.key)) return;
      const direction = dock === 'left' ? e.key === 'ArrowRight' ? 1 : -1 : dock === 'right' ? e.key === 'ArrowLeft' ? 1 : -1 : e.key === 'ArrowUp' ? 1 : -1;
      layout[closedKey(dock)] = false; layout[dock] += direction * 20; apply(); persist(); e.preventDefault();
    });
    document.getElementById(`toggle-${dock}`)!.addEventListener('click', () => {
      const closed = document.getElementById(`${dock}-panel`)!.classList.contains('collapsed');
      layout[closedKey(dock)] = !closed; apply(); persist();
    });
  }
  const modes = document.getElementById('bottom-modes')!;
  const renderModes = () => modes.replaceChildren(
    h('button', { class: state.mode === 'setup' ? 'on' : '', onclick: () => { state.setMode('setup'); layout.bottomClosed = false; apply(); persist(); } }, '✎ Setup'),
    h('button', { class: state.mode === 'animate' ? 'on' : '', onclick: () => { state.setMode('animate'); layout.bottomClosed = false; apply(); persist(); } }, '▶ Animate'),
  );
  state.onStructure(renderModes); renderModes();
  window.addEventListener('resize', apply);
  window.addEventListener('riglab-expand-bottom', () => {
    beforePreview ??= layout.bottom;
    layout.bottomClosed = false; layout.bottom = Math.max(layout.bottom, 420); apply(); persist();
  });
  window.addEventListener('riglab-close-preview', () => {
    if (beforePreview !== undefined) { layout.bottom = beforePreview; beforePreview = undefined; apply(); persist(); }
  });
  apply();
}
