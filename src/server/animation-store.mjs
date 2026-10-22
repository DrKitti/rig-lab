import { readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export class AnimationConflict extends Error { status = 409; }

/** One file per shared skeleton. Serial writes + revision checks protect open editor tabs. */
export function animationStore(directory) {
  let pending = Promise.resolve();
  const file = key => {
    if (!/^[a-z0-9-]+$/i.test(key)) throw new Error('Invalid animation library');
    return resolve(directory, `${key}.animations.json`);
  };
  const read = async key => JSON.parse(await readFile(file(key), 'utf8'));
  const hydrate = async rig => {
    if (!rig.animationLibrary) return rig;
    const library = await read(rig.animationLibrary);
    if (library.skeletonVersion !== rig.skeletonVersion) throw new Error('Skeleton/library mismatch');
    return { ...rig, clips: library.clips, animationLibraryRevision: library.revision };
  };
  const save = (rig, persistRig) => {
    const run = pending.then(async () => {
      if (!rig.animationLibrary) { await persistRig(rig); return {}; }
      const library = await read(rig.animationLibrary);
      if (library.skeletonVersion !== rig.skeletonVersion) throw new Error('Skeleton/library mismatch');
      if (rig.animationLibraryRevision !== library.revision)
        throw new AnimationConflict('คลังท่าถูกแก้จากอีกแท็บแล้ว กรุณา Export งานนี้เก็บไว้และโหลดใหม่ก่อนบันทึก');
      validateClips(rig.clips, new Set(rig.bones.map(b => b.name)));
      const next = { ...library, clips: rig.clips, revision: library.revision + 1 };
      const stored = { ...rig }; delete stored.animationLibraryRevision; delete stored.clips;
      // The rig snapshot is persisted first; the library is the final commit.
      await persistRig(stored);
      const temporary = `${file(rig.animationLibrary)}.tmp`;
      await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', 'utf8');
      await rename(temporary, file(rig.animationLibrary));
      return { animationLibraryRevision: next.revision };
    });
    pending = run.catch(() => {});
    return run;
  };
  const assets = async () => Promise.all((await readdir(directory)).filter(f => f.endsWith('.animations.json'))
    .map(async name => ({ name, source: await readFile(resolve(directory, name), 'utf8') })));
  return { hydrate, save, assets };
}

export function validateClips(clips, boneNames) {
  if (!Array.isArray(clips) || !clips.length) throw new Error('Animation library needs at least one clip');
  const names = new Set();
  const channels = new Set(['rotate', 'x', 'y', 'scaleX', 'scaleY', 'plant']);
  for (const clip of clips) {
    if (!clip || typeof clip.name !== 'string' || !clip.name.trim() || names.has(clip.name)
      || typeof clip.type !== 'string' || typeof clip.loop !== 'boolean'
      || !Number.isFinite(clip.duration) || clip.duration <= 0 || !clip.bones || typeof clip.bones !== 'object')
      throw new Error('Invalid or duplicate animation clip');
    names.add(clip.name);
    for (const [bone, timelines] of Object.entries(clip.bones)) {
      if (!boneNames.has(bone)) throw new Error(`Unknown animation bone: ${bone}`);
      for (const [channel, keys] of Object.entries(timelines)) {
        if (!channels.has(channel) || !Array.isArray(keys)) throw new Error('Invalid animation channel');
        if (keys.some(k => !Number.isFinite(k.time) || k.time < 0 || !Number.isFinite(k.value)))
          throw new Error('Invalid animation key');
      }
    }
  }
}
