import bundledRig from './data/hero-c3-B7.rig.json';
import { deleteBone, findBone } from './editor/rigEdit';
import { EditorState } from './editor/state';
import { mountLeft } from './editor/ui/left';
import { mountRight } from './editor/ui/right';
import { mountTimeline } from './editor/ui/timeline';
import { mountTopbar } from './editor/ui/topbar';
import { Viewport } from './editor/viewport';
import { normalizeRig, type RigData } from './rig/core/types';

/** Which src/data/<name>.rig.json to edit: ?rig=<name>, default hero-c3-B7. */
const RIG_NAME = new URLSearchParams(location.search).get('rig') ?? 'hero-c3-B7';

/** Loads from the dev server so later saves don't reload the page; falls back to the production master. */
async function loadRig(name: string): Promise<RigData> {
  try {
    const res = await fetch(import.meta.env.DEV ? `/__rig/${name}` : `/rigs/${name}.rig.json`);
    if (res.ok) return normalizeRig(await res.json());
  } catch {
    // No dev server (e.g. a static build).
  }
  return normalizeRig(bundledRig as unknown as RigData);
}

async function start(): Promise<void> {
  const rig = await loadRig(RIG_NAME);
  const state = new EditorState(rig);
  const $ = (id: string) => document.getElementById(id)!;

  const save = async () => {
    const res = await fetch(`/__rig/${rig.name}`, { method: 'POST', body: JSON.stringify(rig) });
    if (!res.ok) throw new Error(await res.text());
    state.markSaved();
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(rig, null, 2) + '\n'], { type: 'application/json' }));
    a.download = `${rig.name}.rig.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const viewport = new Viewport(state);
  // Handle for poking at the editor from the devtools console.
  if (import.meta.env.DEV) Object.assign(window, { rigLab: { state, viewport } });
  mountTopbar($('topbar'), state, { save, download });
  mountLeft($('left'), state);
  mountRight($('right'), state, { partSize: (name) => viewport.partSize(name) });
  const timeline = mountTimeline($('timeline'), state);
  await viewport.mount($('viewport'));
  viewport.mountToolbar($('viewport'));

  const toast = $('toast');
  let timer = 0;
  state.onToast((message, error) => {
    toast.textContent = message;
    toast.className = error ? 'error' : '';
    toast.hidden = false;
    clearTimeout(timer);
    timer = window.setTimeout(() => (toast.hidden = true), error ? 4000 : 2200);
  });

  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (ctrl && key === 's') {
      e.preventDefault();
      save().then(
        () => state.toast(`บันทึกแล้ว → src/data/${rig.name}.rig.json`),
        (err) => state.toast(`บันทึกไม่ได้: ${err}`, true),
      );
      return;
    }
    if (typing) return;
    if (ctrl && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      state.undo();
    } else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault();
      state.redo();
    } else if (state.mode === 'animate' && e.code === 'Space') {
      e.preventDefault();
      timeline.togglePlay();
    } else if (state.mode === 'animate' && key === 'k') {
      timeline.keySelection();
    } else if (state.mode === 'animate' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      if (e.shiftKey) timeline.jumpKey(dir);
      else state.setTime(state.time + dir / 30);
    } else if (e.key === 'Delete') {
      if (state.mode === 'animate') timeline.deleteSelected();
      else if (state.selection?.kind === 'bone' && findBone(rig, state.selection.name).parent) {
        const name = state.selection.name;
        state.edit(() => deleteBone(rig, name), true);
      }
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) e.preventDefault();
  });
}

void start();
