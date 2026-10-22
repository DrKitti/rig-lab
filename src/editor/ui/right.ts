import { CHANNEL_DEFAULT, sampleClip } from '../../rig/core/animation';
import { CLIP_TYPES, EASINGS, type BoneData, type Channel, type MeshDef, type PartData } from '../../rig/core/types';
import { keyAt, renameClip, setEasing, setKey } from '../animEdit';
import { jointBlend, setJointBlend } from '../meshSettings';
import { findBone, findPart, isDescendant, renameBone, renamePart, reparentBone, setPartBone, snapPivotToBone } from '../rigEdit';
import type { EditorState } from '../state';
import { Bindings, h, value } from './dom';
import { boneSide, fields, section } from './fields';

export interface RightActions {
  partSize(name: string): { width: number; height: number } | null;
}

const EASING_LABEL: Record<string, string> = {
  linear: 'เส้นตรง',
  easeInOut: 'นุ่ม เข้า-ออก',
  easeIn: 'ค่อยๆ เร่ง',
  easeOut: 'ค่อยๆ ชะลอ',
  stepped: 'กระโดด (ไม่ไล่)',
};

/** Bone groups shown in the Bones card, in this order. */
const GROUPS: [string, RegExp][] = [
  ['ลำตัว + หัว', /^(root|torso|head|neck|hip|chest|hair|scarf)/],
  ['แขนหน้า', /^arm_F/],
  ['แขนหลัง', /^arm_B/],
  ['ขาหน้า', /^leg_F/],
  ['ขาหลัง', /^leg_B/],
];

function groupOf(name: string): string {
  return GROUPS.find(([, re]) => re.test(name))?.[0] ?? 'อื่นๆ';
}

/** Right column: inspector in Setup mode; clip, keyframe and bone controls in Animate mode. */
export function mountRight(root: HTMLElement, state: EditorState, actions: RightActions): void {
  const rig = state.rig;
  const bindings = new Bindings();
  const f = fields(state, bindings);
  const collapsed = new Set<string>();

  // ---------- Setup ----------

  const boneInspector = (bone: BoneData) => {
    const parents = rig.bones.filter((b) => !isDescendant(rig, b.name, bone.name)).map((b) => b.name);
    return section(
      `กระดูก · ${bone.name}`,
      'ลาก □ ย้ายจุดเริ่ม · ลาก ● หมุน/ยืด · ลากตัวกระดูกเพื่อหมุน',
      h(
        'div',
        { class: 'grid' },
        f.text('ชื่อ', bone.name, (v) => {
          renameBone(rig, bone.name, v);
          state.selection = { kind: 'bone', name: v };
        }),
        bone.parent
          ? f.select('พ่อ', parents, bone.parent, (v) => reparentBone(rig, bone.name, v))
          : f.select('พ่อ', ['— (root)'], '— (root)', () => {}, true),
        f.number('x', () => bone.x, (v) => (bone.x = v)),
        f.number('y', () => bone.y, (v) => (bone.y = v)),
        f.number('หมุน°', () => bone.rotation, (v) => (bone.rotation = v), 0.5),
        f.number('ยาว', () => bone.length, (v) => (bone.length = Math.max(0, v))),
        f.number('scale X', () => bone.scaleX ?? 1, (v) => (bone.scaleX = v), 0.05),
        f.number('scale Y', () => bone.scaleY ?? 1, (v) => (bone.scaleY = v), 0.05),
      ),
    );
  };

  const partInspector = (part: PartData) => {
    const tint = h('input', {
      type: 'color',
      value: `#${(part.tint ?? 0xffffff).toString(16).padStart(6, '0')}`,
      onchange: (e: Event) => state.edit(() => (part.tint = parseInt(value(e).slice(1), 16))),
    });
    return section(
      `ชิ้นส่วน · ${part.name}`,
      'ลากภาพบนจอเพื่อย้าย',
      h(
        'div',
        { class: 'grid' },
        f.text('ชื่อ', part.name, (v) => {
          renamePart(rig, part.name, v);
          state.selection = { kind: 'part', name: v };
        }),
        f.select('กระดูก', rig.bones.map((b) => b.name), part.bone, (v) => setPartBone(rig, part.name, v)),
        f.select('ภาพ', Object.keys(rig.textures), part.texture, (v) => (part.texture = v)),
        h(
          'label',
          { class: 'field' },
          h('span', {}, 'สี (tint)'),
          h('span', { class: 'inline' }, tint, h('button', { class: 'tiny', disabled: part.tint === undefined, onclick: () => state.edit(() => delete part.tint, true) }, 'ล้าง')),
        ),
        f.number('x', () => part.x ?? 0, (v) => (part.x = v)),
        f.number('y', () => part.y ?? 0, (v) => (part.y = v)),
        f.number('หมุน°', () => part.rotation, (v) => (part.rotation = v), 0.5),
        h('span'),
        f.number('pivot X', () => part.originX, (v) => (part.originX = v), 0.01),
        f.number('pivot Y', () => part.originY, (v) => (part.originY = v), 0.01),
      ),
      h(
        'button',
        {
          class: 'wide',
          title: 'ให้จุดหมุนของภาพอยู่ตรงจุดเริ่มกระดูก โดยภาพไม่ขยับ',
          onclick: () => {
            const size = actions.partSize(part.name);
            if (size) state.edit(() => snapPivotToBone(rig, part.name, size), true);
          },
        },
        'ย้าย pivot มาที่จุดเริ่มกระดูก',
      ),
      meshControls(part),
    );
  };

  /** Mesh bending along the part's bone and its child bones (elbow/knee, then wrist/ankle). */
  const meshControls = (part: PartData) => {
    const kids = rig.bones.filter((b) => b.parent === part.bone).map((b) => b.name);
    const mesh = part.mesh;
    const pairedLimb = ['arm_F', 'arm_B', 'leg_F', 'leg_B'].includes(part.name);
    const toggle = f.check('งอได้ (mesh)', !!mesh, (on) => {
      if (!on) return void delete part.mesh;
      if (kids.length === 0) throw new Error(`กระดูก "${part.bone}" ไม่มีกระดูกลูก จึงงอไม่ได้`);
      part.mesh = { child: kids[0] };
    });
    if (!mesh) return h('div', { class: 'mesh-box' }, toggle);
    return h(
      'div',
      { class: 'mesh-box' },
      toggle,
      h(
        'div',
        { class: 'grid' },
        f.select('งอที่กระดูก', kids.length ? kids : [mesh.child], mesh.child, (v) => (mesh.child = v)),
        pairedLimb ? null : f.number('ช่วงนุ่มข้อแรก (blend)', () => jointBlend(mesh), (v) => setJointBlend(mesh, 0, v), 1),
        f.number('แถว (rows)', () => mesh.rows ?? 16, (v) => (mesh.rows = Math.max(2, Math.round(v))), 1),
        f.number('คอลัมน์ (cols)', () => mesh.cols ?? 3, (v) => (mesh.cols = Math.max(2, Math.round(v))), 1),
        ...chainControls(mesh, !pairedLimb),
      ),
      h('small', { class: 'muted' }, 'จุดงอคือจุดเริ่มของกระดูกลูก — ย้ายได้ที่ □ ของกระดูกนั้น'),
      pairedLimb ? h('small', { class: 'muted' }, 'ปรับความนุ่มของศอก / เข่า / เท้าที่แถบล่าง — ใช้กับสองข้างพร้อมกัน') : null,
    );
  };

  /** Extra joints further down the limb (wrist, ankle): one picker per level, plus its blend. */
  const chainControls = (mesh: MeshDef, showBlend = true) => {
    const NONE = '— ไม่งอต่อ';
    const chain = mesh.chain ?? [];
    const out: HTMLElement[] = [];
    for (let level = 0; level <= chain.length; level++) {
      const above = level === 0 ? mesh.child : chain[level - 1];
      const kids = rig.bones.filter((b) => b.parent === above).map((b) => b.name);
      if (level === chain.length && kids.length === 0) break;
      const current = chain[level] ?? NONE;
      out.push(
        f.select(`งอต่อที่ (ข้อ ${level + 2})`, [NONE, ...kids], current, (v) => {
          const next = chain.slice(0, level);
          if (v !== NONE) next.push(v);
          if (next.length) mesh.chain = next;
          else delete mesh.chain;
          if (mesh.blends) mesh.blends = mesh.blends.slice(0, next.length + 1);
        }),
      );
      if (showBlend && level < chain.length) {
        const joint = level + 1;
        out.push(
          f.number(`blend ข้อ ${level + 2}`, () => jointBlend(mesh, joint), (v) => setJointBlend(mesh, joint, v), 1),
        );
      }
    }
    return out;
  };

  // ---------- Animate ----------

  const clipCard = () => {
    const clip = state.clip;
    return section(
      'Clip',
      'ท่า',
      h(
        'div',
        { class: 'grid' },
        f.text('ชื่อ', clip.name, (v) => {
          renameClip(rig, clip.name, v);
          state.clipName = v;
        }),
        f.select('ชนิด', CLIP_TYPES, clip.type, (v) => (clip.type = v)),
        f.number('ความยาว (s)', () => clip.duration, (v) => (clip.duration = Math.max(0.05, Math.round(v * 30) / 30)), 0.05),
        f.number('พุ่งไปหน้า (root motion)', () => clip.rootMotion ?? 0, (v) => (clip.rootMotion = v)),
      ),
      f.check('วนซ้ำ (loop)', clip.loop, (v) => (clip.loop = v)),
    );
  };

  const keyframeCard = () => {
    const keys = state.selectedKeys;
    if (keys.length === 0) return section('Keyframe', 'คลิก ◆ ในไทม์ไลน์เพื่อเลือก · Shift+คลิกเพื่อเลือกหลายอัน', null);
    const clip = state.clip;
    const first = keyAt(clip, keys[0].bone, keys[0].channel, keys[0].time);
    const times = new Set(keys.map((k) => k.time));
    return section(
      'Keyframe',
      `เลือก ${keys.length} คีย์${times.size === 1 ? ` ที่ ${keys[0].time.toFixed(2)}s` : ''}`,
      h(
        'label',
        { class: 'field' },
        h('span', {}, 'การไล่ค่าไปคีย์ถัดไป'),
        h(
          'select',
          { onchange: (e: Event) => state.edit(() => setEasing(clip, keys, value(e) as never), true) },
          ...EASINGS.map((e) => h('option', { value: e, selected: (first?.easing ?? 'linear') === e }, EASING_LABEL[e])),
        ),
      ),
    );
  };

  const bonesCard = () => {
    const clip = state.clip;
    const groups = new Map<string, BoneData[]>();
    for (const bone of rig.bones) {
      const g = groupOf(bone.name);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(bone);
    }
    const current = (bone: string, ch: Channel) => sampleClip(clip, state.time)[bone]?.[ch] ?? CHANNEL_DEFAULT[ch];

    const slider = (bone: BoneData, ch: Channel, label: string, min: number, max: number) => {
      const keyed = () => !!keyAt(clip, bone.name, ch, state.time);
      const name = h('span', { class: `mono name ${boneSide(bone.name)}` }, label);
      const mark = h('span', { class: 'key-mark' });
      const read = () => {
        mark.textContent = keyed() ? '◆' : '';
        return String(Math.round(current(bone.name, ch) * 10) / 10);
      };
      const write = (v: number) => setKey(clip, bone.name, ch, state.time, v);
      return h(
        'div',
        {
          class: `slider-row${state.selection?.kind === 'bone' && state.selection.name === bone.name ? ' selected' : ''}`,
          onpointerdown: () => state.selection?.name !== bone.name && state.select({ kind: 'bone', name: bone.name }),
        },
        name,
        mark,
        bindings.bind(
          h('input', {
            type: 'range',
            min,
            max,
            step: 0.5,
            // One undo step per slider drag.
            onpointerdown: () => state.checkpoint(),
            oninput: (e: Event) => {
              write(Number(value(e)));
              state.changed();
            },
          }),
          read,
        ),
        bindings.bind(
          h('input', {
            type: 'number',
            step: 0.5,
            onchange: (e: Event) => {
              const v = Number(value(e));
              if (Number.isFinite(v)) state.edit(() => write(v));
            },
          }),
          read,
        ),
      );
    };

    const body: HTMLElement[] = [];
    for (const [group, bones] of groups) {
      const open = !collapsed.has(group);
      body.push(
        h(
          'button',
          {
            class: 'group-head',
            onclick: () => {
              if (open) collapsed.add(group);
              else collapsed.delete(group);
              render();
            },
          },
          `${open ? '▾' : '▸'} ${group}`,
        ),
      );
      if (!open) continue;
      for (const bone of bones) {
        if (!bone.parent) {
          body.push(slider(bone, 'x', `${bone.name} ซ้าย/ขวา`, -400, 400), slider(bone, 'y', `${bone.name} ขึ้น/ลง`, -400, 400));
        }
        body.push(slider(bone, 'rotate', bone.name, -180, 180));
      }
    }
    return section('Bones', 'ปรับค่า = ใส่คีย์ที่เวลาปัจจุบัน · ◆ = มีคีย์ตรงนี้', ...body);
  };

  const footPlantCard = () => {
    if (!rig.footPlants?.length) return null;
    return section('วางเท้า', 'เลือกสถานะ = ใส่คีย์ ณ เวลานี้ · บันทึกพร้อมท่า',
      ...rig.footPlants.map(foot => {
        const select = bindings.bind(h('select', {
          onchange: (e: Event) => state.edit(() => {
            setKey(state.clip, foot.bone, 'plant', state.time, Number(value(e)));
            const key = keyAt(state.clip, foot.bone, 'plant', state.time);
            if (key) key.easing = 'stepped';
          }, true),
        },
        h('option', {value: '-1'}, 'อัตโนมัติ'),
        h('option', {value: '1'}, 'ติดพื้น'),
        h('option', {value: '0'}, 'ยกเท้า')),
        () => String(sampleClip(state.clip, state.time)[foot.bone]?.plant ?? -1));
        return h('label', {class: 'field'}, h('span', {}, foot.bone.includes('_F_') ? 'เท้าหน้า' : 'เท้าหลัง'), select);
      }),
      h('small', {class: 'muted'}, 'อัตโนมัติ: ยกเป้า IK ขึ้นเพื่อยกเท้า · ติดพื้น: ล็อกเป้าข้อเท้าและมุมรองเท้า'),
    );
  };

  const render = () => {
    bindings.clear();
    const sel = state.selection;
    if (state.mode === 'setup') {
      const cards: HTMLElement[] = [];
      if (sel?.kind === 'bone' && rig.bones.some((b) => b.name === sel.name)) cards.push(boneInspector(findBone(rig, sel.name)));
      else if (sel?.kind === 'part' && rig.parts.some((p) => p.name === sel.name)) cards.push(partInspector(findPart(rig, sel.name)));
      else cards.push(section('Inspector', 'คลิกกระดูกหรือภาพบนจอ หรือเลือกจาก Hierarchy', null));
      root.replaceChildren(...cards);
    } else {
      const foot = footPlantCard();
      root.replaceChildren(clipCard(), ...(foot ? [foot] : []), keyframeCard(), bonesCard());
    }
    bindings.refresh();
  };

  state.onStructure(render);
  state.onChange(() => bindings.refresh());
  render();
}
