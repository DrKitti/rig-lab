/** Maintained rigs offered in Rig Lab's picker. */
export const CHARACTERS: readonly { rig: string; label: string }[] = [
  { rig: 'hero-c3-B7', label: 'Hero C3 · production master' },
];

/** Opens another rig (the page reloads; unsaved edits trigger the browser's leave warning). */
export function openRig(name: string): void {
  const url = new URL(location.href);
  url.searchParams.set('rig', name);
  location.href = url.toString();
}
