import { Application, Container } from 'pixi.js';
import { loadRigTextures, SkeletonView, type RigTextures } from '../../rig/pixi/SkeletonView';
import { blendPreviewPose } from '../blendPreview';
import { BLEND_GROUPS, groupBlend, groupMeshes, jointBlend, setGroupBlend, type BlendGroup } from '../meshSettings';
import type { EditorState } from '../state';
import { h } from './dom';

/** Paired presets plus a non-destructive A/B preview using the real rig renderer. */
export function mountBlendDock(root: HTMLElement, state: EditorState): void {
  const groups = Object.keys(BLEND_GROUPS) as BlendGroup[];
  const controls = new Map<BlendGroup, HTMLSelectElement>();
  let active: BlendGroup = 'elbow', opened = false, angle = 90;
  let choices: [number, number] = [40, 64];
  let apps: Application[] = [], assets: RigTextures | null = null, assetKey = '';
  let requested = 0, lastSignature = '';
  const hosts: HTMLElement[] = [], choiceInputs: HTMLSelectElement[] = [];
  const compare = h('div', { class: 'blend-compare', hidden: true });
  const title = h('strong');
  const status = h('p', { class: 'compare-note', role: 'status' });
  const angleInput = h('select', { 'aria-label': 'มุมทดสอบพรีวิว', onchange: () => { angle = Number(angleInput.value); void renderPreview(); } });
  const chooseOptions = (select: HTMLSelectElement, values: readonly number[], current: number) => {
    const all = [...new Set([...values, current])].sort((a, b) => a - b);
    select.replaceChildren(...all.map(v => h('option', { value: String(v), selected: v === current }, String(v))));
  };
  const refreshPreviewControls = () => {
    title.textContent = `เทียบการงอ · ${BLEND_GROUPS[active].label}`;
    chooseOptions(angleInput, active === 'foot' ? [-20, 0, 20, 40] : [45, 90, 120], angle);
    for (let i = 0; i < 2; i++) chooseOptions(choiceInputs[i], BLEND_GROUPS[active].presets, choices[i]);
  };
  const show = (group: BlendGroup, before?: number, after?: number) => {
    const changed = active !== group;
    active = group; opened = true; compare.hidden = false;
    const current = groupBlend(state.rig, group);
    const first = groupMeshes(state.rig, group)[0];
    const fallback = typeof current === 'number' ? current : first ? jointBlend(first, BLEND_GROUPS[group].joint) : BLEND_GROUPS[group].presets[0];
    choices = [before ?? fallback, after ?? (BLEND_GROUPS[group].presets.find(v => v > fallback) ?? fallback)];
    if (changed) angle = group === 'foot' ? 20 : 90;
    refreshPreviewControls();
    window.dispatchEvent(new Event('riglab-expand-bottom'));
    void renderPreview();
  };
  const apply = (group: BlendGroup, value: number) => state.edit(() => setGroupBlend(state.rig, group, value));
  const strip = h('div', { class: 'blend-strip' });
  for (const group of groups) {
    const def = BLEND_GROUPS[group];
    const select = h('select', { id: `blend-${group}`, 'aria-label': `การงอ${def.label}`, onchange: () => {
      if (!select.value) return;
      const old = groupBlend(state.rig, group), value = Number(select.value);
      if (!Number.isFinite(value)) return;
      if (apply(group, value)) show(group, typeof old === 'number' ? old : value, value);
    } });
    controls.set(group, select);
    strip.append(h('div', { class: 'blend-control' }, h('label', { for: `blend-${group}` }, `${def.icon} ${def.label}`), select,
      h('button', { 'aria-label': `เปรียบเทียบ${def.label}`, onclick: () => show(group) }, 'เทียบ')));
  }
  compare.append(h('div', { class: 'compare-head' }, title,
    h('label', {}, 'มุมงอ ', angleInput), h('span', { class: 'spacer' }),
    h('button', { 'aria-label': 'ปิดพรีวิว', onclick: () => {
      opened = false; requested++; compare.hidden = true;
      window.dispatchEvent(new Event('riglab-close-preview'));
    } }, '✕')));
  const grid = h('div', { class: 'compare-grid' });
  for (let i = 0; i < 2; i++) {
    const select = h('select', { 'aria-label': `ค่าเปรียบเทียบ ${i === 0 ? 'A' : 'B'}`, onchange: () => { choices[i] = Number(select.value); void renderPreview(); } });
    choiceInputs.push(select);
    const host = h('div', { class: 'compare-canvas', 'aria-label': `ภาพพรีวิว ${i === 0 ? 'A' : 'B'}` }); hosts.push(host);
    grid.append(h('div', { class: 'compare-card' }, h('div', { class: 'compare-card-head' }, h('strong', {}, i === 0 ? 'A' : 'B'), select,
      h('button', { class: 'primary', 'aria-label': `ใช้ค่า ${i === 0 ? 'A' : 'B'} ทั้งสองข้าง`, onclick: () => apply(active, choices[i]) }, 'ใช้ค่านี้')), host));
  }
  compare.append(grid, status);
  root.append(strip, h('div', { class: 'blend-hint' }, 'ใช้ทั้งสองข้าง · ค่ามาก = ช่วงงอนุ่มกว้างขึ้น · 💾 บันทึก / Ctrl+S'), compare);

  const refresh = () => {
    root.hidden = state.mode !== 'setup';
    if (opened && state.mode !== 'setup') {
      opened = false; requested++; compare.hidden = true;
      window.dispatchEvent(new Event('riglab-close-preview'));
    }
    for (const group of groups) {
      const select = controls.get(group)!, current = groupBlend(state.rig, group);
      select.disabled = current === undefined;
      if (typeof current === 'number') chooseOptions(select, BLEND_GROUPS[group].presets, current);
      else select.replaceChildren(h('option', { value: '', selected: true, disabled: true }, current === 'mixed' ? 'ต่างกัน' : '—'), ...BLEND_GROUPS[group].presets.map(v => h('option', { value: String(v) }, String(v))));
    }
    const signature = JSON.stringify([state.rig.parts, state.rig.bones, state.rig.textures]);
    if (opened && state.mode === 'setup' && signature !== lastSignature) { lastSignature = signature; void renderPreview(); }
  };

  async function renderPreview(): Promise<void> {
    if (!opened || state.mode !== 'setup') return;
    const request = ++requested, group = active, values = [...choices];
    status.textContent = 'กำลังวาดพรีวิว…';
    try {
      const key = JSON.stringify(state.rig.textures);
      if (!assets || key !== assetKey) {
        const loaded = await loadRigTextures(structuredClone(state.rig));
        if (request !== requested) return;
        assets = loaded; assetKey = key;
      }
      if (!apps.length) {
        const created = [new Application(), new Application()];
        await Promise.all(created.map(app => app.init({ width: 360, height: 170, background: '#211e29', antialias: true, autoStart: false, resolution: window.devicePixelRatio || 1 })));
        // Multiple async requests can arrive before initialization finishes.
        if (request !== requested) { for (const app of created) app.destroy(true, { children: true }); return; }
        apps = created; apps.forEach((app, i) => hosts[i].replaceChildren(app.canvas));
      }
      if (request !== requested) return;
      const views: { view: SkeletonView; app: Application; slot: number; x: number; y: number; width: number; height: number }[] = [];
      for (let i = 0; i < 2; i++) {
        const app = apps[i];
        for (const child of app.stage.removeChildren()) child.destroy({ children: true });
        const rig = structuredClone(state.rig); setGroupBlend(rig, group, values[i]);
        const names = BLEND_GROUPS[group].parts;
        for (const [slot, name] of names.entries()) {
          const data = structuredClone(rig); data.parts = data.parts.filter(p => p.name === name); data.drawOrder = data.drawOrder.filter(n => n === name);
          if (!data.parts.length) continue;
          const view = new SkeletonView(data, assets!); view.skeleton.ikEnabled = false;
          view.update(blendPreviewPose(data, group, angle));
          const bounds = view.getLocalBounds();
          views.push({ view, app, slot, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
        }
      }
      const maxWidth = Math.max(1, ...views.map(v => v.width)), maxHeight = Math.max(1, ...views.map(v => v.height));
      const scale = Math.min(155 / maxWidth, 150 / maxHeight);
      for (const item of views) {
        const holder = new Container(); holder.position.set(90 + item.slot * 180, 85);
        item.view.scale.set(scale); item.view.position.set(-(item.x + item.width / 2) * scale, -(item.y + item.height / 2) * scale);
        holder.addChild(item.view); item.app.stage.addChild(holder);
      }
      for (const app of apps) app.render();
      status.textContent = `พรีวิว${BLEND_GROUPS[group].label} ${angle}° · แสดงทั้งสองข้างด้วยสเกลเดียวกัน · A/B ยังไม่แก้ชุดจนกด “ใช้ค่านี้”`;
    } catch (error) {
      if (request === requested) status.textContent = `แสดงพรีวิวไม่ได้: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  state.onChange(refresh); state.onStructure(refresh); refresh();
  window.addEventListener('pagehide', () => { requested++; for (const app of apps) app.destroy(true, { children: true }); });
  // Keep the paired controls unavailable for custom rigs without supported limb meshes.
  for (const group of groups) controls.get(group)!.disabled = !groupMeshes(state.rig, group).length;
}
