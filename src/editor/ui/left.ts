import { CLIP_TYPES, type BoneData } from '../../rig/core/types';
import { addClip, deleteClip, duplicateClip } from '../animEdit';
import { addBone, deleteBone, findBone, findPart, reorderPart, reparentBone } from '../rigEdit';
import type { EditorState } from '../state';
import { h, value } from './dom';
import { boneSide, section } from './fields';

/** Left column: clips (Animate), skeleton tree, and draw order (Setup). */
export function mountLeft(root: HTMLElement, state: EditorState): void {
  const rig = state.rig;
  const isSel = (kind: 'bone' | 'part', name: string) => state.selection?.kind === kind && state.selection.name === name;

  /** Row that accepts a dragged item of `type`; calls onDrop with the dragged name. */
  const dropTarget = (el: HTMLElement, type: string, onDrop: (dragged: string) => void) => {
    el.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes(type)) {
        e.preventDefault();
        el.classList.add('drop');
      }
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drop');
      const dragged = e.dataTransfer?.getData(type);
      if (dragged) onDrop(dragged);
    });
  };

  const clips = () => {
    const list = h('div', { class: 'list' });
    for (const clip of rig.clips) {
      const active = clip.name === state.clipName;
      const keyed = Object.keys(clip.bones).length > 0;
      list.append(
        h(
          'div',
          { class: `row${active ? ' selected' : ''}`, onclick: () => state.setClip(clip.name) },
          h('span', { class: 'grow' }, clip.name),
          h('span', { class: `badge type-${clip.type}` }, clip.type),
          h('span', { class: 'muted' }, `${clip.duration}s${clip.loop ? ' ↻' : ''}`),
          keyed ? null : h('span', { class: 'muted', title: 'ยังไม่มีคีย์' }, '○'),
        ),
      );
    }
    const add = h(
      'select',
      {
        class: 'add-select',
        onchange: (e: Event) => {
          const type = value(e);
          (e.target as HTMLSelectElement).value = '';
          let name = '';
          if (type && state.edit(() => (name = addClip(rig, type)), true)) state.setClip(name);
        },
      },
      h('option', { value: '' }, '+ ท่าใหม่…'),
      ...CLIP_TYPES.map((t) => h('option', { value: t }, t)),
    );
    return section(
      'ท่า · Clips',
      'คลิกเพื่อเลือกท่าที่จะแก้',
      list,
      h(
        'div',
        { class: 'buttons' },
        add,
        h(
          'button',
          {
            title: 'ทำสำเนาท่านี้',
            onclick: () => {
              let name = '';
              if (state.edit(() => (name = duplicateClip(rig, state.clipName)), true)) state.setClip(name);
            },
          },
          '⧉',
        ),
        h(
          'button',
          {
            title: 'ลบท่านี้',
            disabled: rig.clips.length <= 1,
            onclick: () => {
              if (confirm(`ลบท่า "${state.clipName}"?`)) state.edit(() => deleteClip(rig, state.clipName), true);
            },
          },
          '✕',
        ),
      ),
    );
  };

  const tree = () => {
    const setup = state.mode === 'setup';
    const keyed = new Set(Object.keys(state.clip.bones));
    const list = h('div', { class: 'list tree' });
    const row = (bone: BoneData, depth: number) => {
      const parts = rig.parts.filter((p) => p.bone === bone.name);
      const el = h(
        'div',
        {
          class: `row${isSel('bone', bone.name) ? ' selected' : ''}`,
          style: `padding-left:${8 + depth * 14}px`,
          draggable: setup && bone.parent ? 'true' : 'false',
          onclick: () => state.select({ kind: 'bone', name: bone.name }),
          ondragstart: (e: Event) => (e as DragEvent).dataTransfer!.setData('text/bone', bone.name),
        },
        h('span', { class: `dot ${boneSide(bone.name)}` }),
        h('span', { class: 'mono grow' }, bone.name),
        !setup && keyed.has(bone.name) ? h('span', { class: 'key-mark', title: 'มีคีย์ในท่านี้' }, '◆') : null,
        ...(setup
          ? parts.map((p) =>
              h(
                'span',
                {
                  class: `chip${isSel('part', p.name) ? ' selected' : ''}`,
                  onclick: (e: Event) => {
                    e.stopPropagation();
                    state.select({ kind: 'part', name: p.name });
                  },
                },
                p.name,
              ),
            )
          : []),
      );
      if (setup) dropTarget(el, 'text/bone', (dragged) => dragged !== bone.name && state.edit(() => reparentBone(rig, dragged, bone.name), true));
      list.append(el);
      for (const child of rig.bones.filter((b) => b.parent === bone.name)) row(child, depth + 1);
    };
    for (const bone of rig.bones.filter((b) => !b.parent)) row(bone, 0);

    const selected = state.selection?.kind === 'bone' ? state.selection.name : null;
    const buttons = setup
      ? h(
          'div',
          { class: 'buttons' },
          h(
            'button',
            {
              disabled: !selected,
              onclick: () => {
                let name = '';
                if (state.edit(() => (name = addBone(rig, selected!)), true)) state.select({ kind: 'bone', name });
              },
            },
            '+ กระดูกลูก',
          ),
          h(
            'button',
            { disabled: !selected || !findBone(rig, selected).parent, onclick: () => state.edit(() => deleteBone(rig, selected!), true) },
            'ลบกระดูก',
          ),
        )
      : null;
    return section('Hierarchy', setup ? 'ลากแถวไปวางบนกระดูกอื่นเพื่อเปลี่ยนพ่อ' : 'คลิกเพื่อเลือกกระดูก', list, buttons);
  };

  const drawOrder = () => {
    const names = [...rig.drawOrder, ...rig.parts.map((p) => p.name).filter((n) => !rig.drawOrder.includes(n))];
    const list = h('div', { class: 'list' });
    const move = (name: string, index: number) => state.edit(() => reorderPart(rig, name, index), true);
    // Front at the top, like a layers panel.
    for (let index = names.length - 1; index >= 0; index--) {
      const name = names[index];
      const el = h(
        'div',
        {
          class: `row${isSel('part', name) ? ' selected' : ''}`,
          draggable: 'true',
          onclick: () => state.select({ kind: 'part', name }),
          ondragstart: (e: Event) => (e as DragEvent).dataTransfer!.setData('text/part', name),
        },
        h('span', { class: 'mono grow' }, name),
        h('span', { class: 'muted' }, findPart(rig, name).bone),
        h('button', { class: 'tiny', disabled: index === names.length - 1, onclick: (e: Event) => (e.stopPropagation(), move(name, index + 1)) }, '▲'),
        h('button', { class: 'tiny', disabled: index === 0, onclick: (e: Event) => (e.stopPropagation(), move(name, index - 1)) }, '▼'),
      );
      dropTarget(el, 'text/part', (dragged) => dragged !== name && move(dragged, index));
      list.append(el);
    }
    return section('Draw order', 'บนสุด = อยู่หน้าสุด · ลากเพื่อเรียง', list);
  };

  const render = () => {
    root.replaceChildren(...(state.mode === 'animate' ? [clips(), tree()] : [tree(), drawOrder()]));
  };
  state.onStructure(render);
  render();
}
