import { sampleClip } from '../rig/core/animation';
import type { ClipData, Pose, RigData } from '../rig/core/types';
import type { KeyRef } from './animEdit';

export type Mode = 'setup' | 'animate';
export type Selection = { kind: 'bone' | 'part'; name: string } | null;

export interface ViewFlags {
  bones: boolean;
  parts: boolean;
  pivots: boolean;
  onion: boolean;
  rootMotion: boolean;
  flip: boolean;
  /** Wireframe of mesh parts. */
  mesh: boolean;
}

const HISTORY_LIMIT = 200;

/**
 * Editor state shared by the viewport, timeline and panels.
 * `rig` is edited in place (the viewport holds the same object); undo restores into it.
 * Undo covers the rig only — playhead, selection and view settings are not undoable.
 */
export class EditorState {
  mode: Mode = 'animate';
  clipName: string;
  time = 0;
  playing = false;
  speed = 1;
  selection: Selection = null;
  selectedKeys: KeyRef[] = [];
  view: ViewFlags = { bones: true, parts: true, pivots: false, onion: false, rootMotion: false, flip: false, mesh: false };
  /** Viewport zoom relative to "fit". */
  zoom = 1;
  dirty = false;
  clipboard: Pose | null = null;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private valueListeners: (() => void)[] = [];
  private structureListeners: (() => void)[] = [];
  private toastListeners: ((message: string, error: boolean) => void)[] = [];

  constructor(readonly rig: RigData) {
    this.clipName = rig.clips[0].name;
  }

  get clip(): ClipData {
    return this.rig.clips.find((c) => c.name === this.clipName) ?? this.rig.clips[0];
  }

  /** Pose shown in the viewport: the setup pose in Setup mode, the clip at the playhead in Animate mode. */
  pose(): Pose {
    return this.mode === 'animate' ? sampleClip(this.clip, this.time) : {};
  }

  // ---------- Events ----------

  /** Values changed (numbers, time): cheap refresh. */
  onChange(listener: () => void): void {
    this.valueListeners.push(listener);
  }

  /** Lists, names, selection or mode changed: rebuild UI that depends on them. */
  onStructure(listener: () => void): void {
    this.structureListeners.push(listener);
  }

  onToast(listener: (message: string, error: boolean) => void): void {
    this.toastListeners.push(listener);
  }

  changed(): void {
    for (const l of this.valueListeners) l();
  }

  structureChanged(): void {
    for (const l of this.structureListeners) l();
    this.changed();
  }

  toast(message: string, error = false): void {
    for (const l of this.toastListeners) l(message, error);
  }

  // ---------- Undo ----------

  /** Call once before an edit that is applied in steps (e.g. at the start of a drag). */
  checkpoint(): void {
    this.undoStack.push(JSON.stringify(this.rig));
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.dirty = true;
  }

  /** Runs an edit as one undo step. A rejected edit is rolled back and reported. */
  edit(fn: () => void, structural = false): boolean {
    const before = JSON.stringify(this.rig);
    try {
      fn();
    } catch (err) {
      this.restore(before);
      this.structureChanged();
      this.toast(err instanceof Error ? err.message : String(err), true);
      return false;
    }
    this.undoStack.push(before);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.dirty = true;
    if (structural) this.structureChanged();
    else this.changed();
    return true;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    const snap = this.undoStack.pop();
    if (!snap) return;
    this.redoStack.push(JSON.stringify(this.rig));
    this.restore(snap);
    this.structureChanged();
  }

  redo(): void {
    const snap = this.redoStack.pop();
    if (!snap) return;
    this.undoStack.push(JSON.stringify(this.rig));
    this.restore(snap);
    this.structureChanged();
  }

  /** Replaces the rig's contents in place so every holder of `rig` sees the change. */
  replaceRig(data: RigData): void {
    this.checkpoint();
    this.restore(JSON.stringify(data));
    this.structureChanged();
  }

  private restore(snap: string): void {
    Object.assign(this.rig, JSON.parse(snap) as RigData);
    this.dirty = true;
    if (!this.rig.clips.some((c) => c.name === this.clipName)) this.clipName = this.rig.clips[0].name;
    this.time = Math.min(this.time, this.clip.duration);
    this.selectedKeys = [];
    if (this.selection) {
      const { kind, name } = this.selection;
      const list = kind === 'bone' ? this.rig.bones : this.rig.parts;
      if (!list.some((x) => x.name === name)) this.selection = null;
    }
  }

  // ---------- Navigation ----------

  select(selection: Selection): void {
    const same = selection?.kind === this.selection?.kind && selection?.name === this.selection?.name;
    if (same) return;
    this.selection = selection;
    this.structureChanged();
  }

  /** The selected bone, or the bone of the selected part. */
  get selectedBone(): string | null {
    const s = this.selection;
    if (!s) return null;
    if (s.kind === 'bone') return s.name;
    return this.rig.parts.find((p) => p.name === s.name)?.bone ?? null;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.playing = false;
    this.structureChanged();
  }

  setClip(name: string): void {
    this.clipName = name;
    this.time = 0;
    this.selectedKeys = [];
    this.structureChanged();
  }

  setTime(t: number): void {
    this.time = Math.max(0, Math.min(this.clip.duration, t));
    this.changed();
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.structureChanged();
  }

  markSaved(): void {
    this.dirty = false;
    this.structureChanged();
  }
}
