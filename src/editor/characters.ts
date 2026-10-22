import catalog from '../data/rig-catalog.json';

/** Maintained rigs offered in Rig Lab's picker; archive rigs are deliberately excluded. */
export const CHARACTERS: readonly { rig: string; label: string }[] = catalog.rigs;

export function canonicalRigName(name: string): string {
  return Object.hasOwn(catalog.aliases, name) ? (catalog.aliases as Record<string, string>)[name] : name;
}

/** Opens another rig (the page reloads; unsaved edits trigger the browser's leave warning). */
export function openRig(name: string): void {
  const url = new URL(location.href);
  url.searchParams.set('rig', name);
  location.href = url.toString();
}
