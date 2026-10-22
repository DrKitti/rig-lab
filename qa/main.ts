import { Application, Container, Graphics, Text, Rectangle } from 'pixi.js';
import catalog from '../src/data/rig-catalog.json';
import { normalizeRig, sampleClip, type Pose } from '../src/rig/core/index';
import { SkeletonView, loadRigTextures } from '../src/rig/pixi/SkeletonView';
import { blendPreviewPose } from '../src/editor/blendPreview';

const app = new Application(), width = 400, height = 650;
await app.init({ width: catalog.rigs.length * width, height, background: '#201e29', antialias: true });
document.body.append(app.canvas);
const entries = await Promise.all(catalog.rigs.map(async entry => {
  const response = await fetch(import.meta.env.DEV ? `/__rig/${entry.rig}` : `/rigs/${entry.rig}.rig.json`);
  if (!response.ok) throw new Error(`${entry.rig}: ${await response.text()}`);
  const rig = normalizeRig(await response.json());
  return { ...entry, data: rig, textures: await loadRigTextures(rig) };
}));
const select = document.querySelector('#pose') as HTMLSelectElement;
const bones = document.querySelector('#bones') as HTMLInputElement;
const save = document.querySelector('#save') as HTMLButtonElement;
const status = document.querySelector('#status')!;

function render() {
  app.stage.removeChildren().forEach(child => child.destroy({ children: true }));
  entries.forEach((entry, index) => {
    const tile = new Container(); tile.x = width * index; app.stage.addChild(tile);
    tile.addChild(new Text({ text: entry.label, style: { fontFamily: 'Arial', fontSize: 19, fill: '#eee' } })).position.set(12, 12);
    tile.addChild(new Text({ text: 'Knee 52% · foot load 4% · no rigid rise', style: { fontFamily: 'Arial', fontSize: 12, fill: '#bdb4c9' } })).position.set(12, 42);
    const rig = entry.data, key = select.value;
    let pose: Pose = {};
    if (key === 'idle') pose = sampleClip(rig.clips[0], .75);
    if (key === 'elbow') pose = blendPreviewPose(rig, 'elbow', 90);
    if (key === 'knee') {
      pose = blendPreviewPose(rig, 'knee', 90);
      for (const side of ['F', 'B']) pose[`leg_${side}_3`] = { rotate: -((pose[`leg_${side}_1`]?.rotate ?? 0) + (pose[`leg_${side}_2`]?.rotate ?? 0)) };
    }
    if (key === 'plant') pose = { root: { y: 60 } };
    if (key === 'air') pose = { root: { y: 35 }, ik_leg_F: { x: -100, y: -75 }, leg_F_3: { plant: 0 } };
    if (key === 'torso') pose = { torso: { rotate: -16 }, chest: { rotate: 10 } };
    const view = new SkeletonView(rig, entry.textures);
    view.skeleton.ikEnabled = ['plant', 'air', 'idle'].includes(key);
    view.scale.set(.43); view.position.set(200, 510); view.update(pose); tile.addChild(view);
    const floor = 510 + .43 * rig.groundY;
    tile.addChild(new Graphics().moveTo(0, floor).lineTo(width, floor).stroke({ width: 1, color: '#91849f' }));
    if (bones.checked) {
      const graphics = new Graphics(); graphics.position.copyFrom(view.position); graphics.scale.copyFrom(view.scale); tile.addChild(graphics);
      for (const bone of rig.bones) {
        const a = view.skeleton.origin(bone.name), b = view.skeleton.tip(bone.name);
        graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: bone.name.includes('_B') ? '#69adff' : '#ffad55' });
        graphics.circle(a.x, a.y, 5).fill('#eee');
      }
    }
  });
  app.render(); status.textContent = `Ready · ${select.selectedOptions[0].textContent} · ${entries.length} maintained rigs`;
}
select.onchange = render; bones.onchange = render; render(); save.disabled = !import.meta.env.DEV;
save.onclick = async () => {
  const canvas = app.renderer.extract.canvas({ target: app.stage, frame: new Rectangle(0, 0, app.screen.width, height), resolution: 1.5 });
  const blob = await new Promise<Blob>(resolve => (canvas as HTMLCanvasElement).toBlob(value => resolve(value!), 'image/png'));
  const name = `maintained-rigs-${select.value}`;
  const response = await fetch(`/__shot/${name}`, { method: 'POST', body: blob });
  status.textContent = response.ok ? `Saved · ${name}.png` : await response.text();
};
