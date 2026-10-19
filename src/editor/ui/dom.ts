type Attrs = Record<string, string | number | boolean | undefined | ((e: Event) => void)>;
type Kid = Node | string | null | false | undefined;

/** Tiny DOM builder: attrs starting with "on" become listeners; false/undefined attrs are skipped. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid !== null && kid !== false && kid !== undefined) el.append(kid);
  return el;
}

export const value = (e: Event) => (e.target as HTMLInputElement | HTMLSelectElement).value;

/**
 * Inputs whose shown value follows editor state. refresh() re-reads them all,
 * skipping the focused one so typing isn't overwritten.
 */
export class Bindings {
  private items: { input: HTMLInputElement; read: () => string }[] = [];

  bind(input: HTMLInputElement, read: () => string): HTMLInputElement {
    this.items.push({ input, read });
    input.value = read();
    return input;
  }

  clear(): void {
    this.items = [];
  }

  refresh(): void {
    for (const { input, read } of this.items) {
      if (document.activeElement !== input && input.isConnected) input.value = read();
    }
  }
}

/** Keeps receiving pointer moves outside the element while dragging (no-op if the pointer is already gone). */
export function capture(el: Element, e: PointerEvent): void {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    // The pointer was released before capture; the drag simply ends early.
  }
}
