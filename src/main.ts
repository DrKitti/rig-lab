import bundledRig from './data/shared-master.rig.json';
import catalog from './data/rig-catalog.json';
import bundledAnimations from './data/animations/neutral-c-v5.animations.json';
import { deleteBone, findBone } from './editor/rigEdit';
import { EditorState } from './editor/state';
import { mountLeft } from './editor/ui/left';
import { mountRight } from './editor/ui/right';
import { mountTimeline } from './editor/ui/timeline';
import { mountTopbar } from './editor/ui/topbar';
import { mountLayout } from './editor/ui/layout';
import { mountBlendDock } from './editor/ui/blendDock';
import { Viewport } from './editor/viewport';
import { normalizeRig, type RigData } from './rig/core/types';
import { canonicalRigName } from './editor/characters';

/** Historical links resolve to the canonical current outfit IDs. */
const RIG_NAME = canonicalRigName(new URLSearchParams(location.search).get('rig') ?? catalog.defaultRig);

/** Loads from the dev server so later saves don't reload the page; falls back to the production master. */
async function loadRig(name: string): Promise<RigData> {
  try {
    const res = await fetch(import.meta.env.DEV ? `/__rig/${name}` : `/rigs/${name}.rig.json`);
    if (res.ok) return normalizeRig(await res.json());
  } catch {
    // No dev server (e.g. a static build).
  }
  return normalizeRig({ ...bundledRig, clips: bundledAnimations.clips,
    animationLibraryRevision: bundledAnimations.revision } as unknown as RigData);
}

async function start(): Promise<void> {
  const rig = await loadRig(RIG_NAME);
  const state = new EditorState(rig);
  const sharedChannel = new BroadcastChannel('rig-lab-shared-animations');
  const refreshShared = async () => {
    if (state.dirty || !rig.animationLibrary) return;
    const loaded = await loadRig(rig.name);
    if (state.syncAnimationLibrary(loaded)) {
      state.toast('อัปเดตคลังท่ากลางจากชุดอื่นแล้ว');
    }
  };
  sharedChannel.onmessage = () => { void refreshShared(); };
  window.addEventListener('focus', () => { void refreshShared(); });
  const $ = (id: string) => document.getElementById(id)!;

  const save = async () => {
    const res = await fetch(`/__rig/${rig.name}`, { method: 'POST', body: JSON.stringify(rig) });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    if (result.animationLibraryRevision !== undefined) rig.animationLibraryRevision = result.animationLibraryRevision;
    state.markSaved();
    if (rig.animationLibrary) sharedChannel.postMessage(rig.animationLibrary);
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
  mountLayout(state);
  mountBlendDock($('blend-dock'), state);
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
        () => state.toast(rig.animationLibrary ? 'บันทึกชุดและคลังท่ากลางแล้ว · ทุกชุดใช้ร่วมกัน' : `บันทึกแล้ว → src/data/${rig.name}.rig.json`),
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
