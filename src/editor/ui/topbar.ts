import { normalizeRig, type RigData } from '../../rig/core/types';
import { CHARACTERS, openRig } from '../characters';
import type { EditorState } from '../state';
import { h } from './dom';

export interface TopbarActions {
  save(): Promise<void>;
  download(): void;
}

/** Switches between the characters in CHARACTERS; any other rig opened by URL shows as its own entry. */
function characterPicker(current: string): HTMLElement {
  const options = CHARACTERS.some((c) => c.rig === current) ? CHARACTERS : [...CHARACTERS, { rig: current, label: current }];
  return h(
    'select',
    {
      class: 'character-select',
      title: 'เลือกตัวละคร',
      onchange: (e: Event) => openRig((e.target as HTMLSelectElement).value),
    },
    ...options.map((c) => h('option', { value: c.rig, selected: c.rig === current }, c.label)),
  );
}

export function mountTopbar(root: HTMLElement, state: EditorState, actions: TopbarActions): void {
  const fileInput = h('input', {
    type: 'file',
    accept: '.json,application/json',
    hidden: true,
    onchange: async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      try {
        state.replaceRig(normalizeRig(JSON.parse(await file.text()) as RigData));
        state.toast(`นำเข้า ${file.name} แล้ว (ยังไม่บันทึก)`);
      } catch (err) {
        state.toast(`นำเข้าไม่ได้: ${err}`, true);
      }
    },
  });

  const render = () => {
    const clip = state.clip;
    root.replaceChildren(
      h(
        'div',
        { class: 'brand' },
        h('div', { class: 'logo' }, '◐'),
        h('div', {}, h('strong', {}, 'Rig Lab'), h('small', {}, `KOLAHON · RIG ANIMATOR · ${state.rig.name}`)),
      ),
      characterPicker(state.rig.name),
      state.mode === 'animate'
        ? h('div', { class: 'clip-chip' }, clip.name, h('span', { class: `badge type-${clip.type}` }, clip.type))
        : h('div', { class: 'clip-chip' }, 'Setup', h('span', { class: 'badge' }, 'โครงกระดูก')),
      h('div', { class: 'spacer' }),
      h('span', { class: `sync ${state.dirty ? 'dirty' : ''}` }, state.dirty ? '● ยังไม่บันทึก' : '● บันทึกแล้ว'),
      h('button', { class: 'ghost', title: 'Ctrl+Z', disabled: !state.canUndo, onclick: () => state.undo() }, '↶'),
      h('button', { class: 'ghost', title: 'Ctrl+Y', disabled: !state.canRedo, onclick: () => state.redo() }, '↷'),
      h('button', { class: 'ghost', onclick: () => fileInput.click() }, '⤒ Import'),
      h('button', { class: 'ghost', onclick: actions.download }, '⤓ Export'),
      h(
        'button',
        {
          class: 'primary',
          title: 'Ctrl+S',
          onclick: () =>
            actions.save().then(
              () => state.toast(`บันทึกแล้ว → src/data/${state.rig.name}.rig.json`),
              (err) => state.toast(`บันทึกไม่ได้: ${err}`, true),
            ),
        },
        '💾 บันทึก',
      ),
      fileInput,
    );
  };

  state.onStructure(render);
  // Undo availability and the dirty flag change on value edits too.
  let last = '';
  state.onChange(() => {
    const key = `${state.dirty}${state.canUndo}${state.canRedo}`;
    if (key !== last) {
      last = key;
      render();
    }
  });
  render();
}
