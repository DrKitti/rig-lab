import type { EditorState } from '../state';
import { Bindings, h, value } from './dom';

/** Labelled inputs whose edits go through undo history. */
export function fields(state: EditorState, bindings: Bindings) {
  const number = (label: string, read: () => number, write: (v: number) => void, step = 1) =>
    h(
      'label',
      { class: 'field' },
      h('span', {}, label),
      bindings.bind(
        h('input', {
          type: 'number',
          step,
          onchange: (e: Event) => {
            const v = Number(value(e));
            if (Number.isFinite(v)) state.edit(() => write(v));
          },
        }),
        () => String(Math.round(read() * 1000) / 1000),
      ),
    );

  const text = (label: string, current: string, write: (v: string) => void) =>
    h(
      'label',
      { class: 'field' },
      h('span', {}, label),
      h('input', { type: 'text', value: current, onchange: (e: Event) => state.edit(() => write(value(e).trim()), true) }),
    );

  const select = (label: string, options: readonly string[], current: string, write: (v: string) => void, disabled = false) =>
    h(
      'label',
      { class: 'field' },
      h('span', {}, label),
      h(
        'select',
        { disabled, onchange: (e: Event) => state.edit(() => write(value(e)), true) },
        ...options.map((o) => h('option', { value: o, selected: o === current }, o)),
      ),
    );

  const check = (label: string, current: boolean, write: (v: boolean) => void) =>
    h(
      'label',
      { class: 'check' },
      h('input', { type: 'checkbox', checked: current, onchange: (e: Event) => state.edit(() => write((e.target as HTMLInputElement).checked), true) }),
      ` ${label}`,
    );

  return { number, text, select, check };
}

export function section(title: string, hint: string | null, ...body: (Node | null | false)[]): HTMLElement {
  return h('section', { class: 'card' }, h('h2', {}, title, hint ? h('small', {}, hint) : null), ...body);
}

/** Front/back colour coding used across the editor (bone names ending in _F / _B segments). */
export function boneSide(name: string): 'front' | 'back' | 'other' {
  if (/_F(_|$)/.test(name)) return 'front';
  if (/_B(_|$)/.test(name)) return 'back';
  return 'other';
}

export const SIDE_COLOR = { front: 0xff9a3c, back: 0x5fa8ff, other: 0xe8e8f0 } as const;
