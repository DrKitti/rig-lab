/** Maintained rigs offered in Rig Lab's picker. */
export const CHARACTERS: readonly { rig: string; label: string }[] = [
  { rig: 'hero-c3-B7', label: 'Hero C3 · shared C master' },
  { rig: 'neutral-skeleton-c-v1', label: 'Neutral · shared C' },
  { rig: 'neutral-armb-center-trial-v1', label: 'Neutral · ทดลองจุดหมุนแขนฟ้า' },
  { rig: 'time-travel-armb-center-trial-v1', label: 'Time Travel · ทดลองจุดหมุนแขนฟ้า' },
  { rig: 'time-travel-torso-fresh-master-v3', label: 'Time Travel · ชุดปัจจุบัน' },
];

/** Opens another rig (the page reloads; unsaved edits trigger the browser's leave warning). */
export function openRig(name: string): void {
  const url = new URL(location.href);
  url.searchParams.set('rig', name);
  location.href = url.toString();
}
