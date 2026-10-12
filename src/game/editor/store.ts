import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
export const categories = [
  "POI",
  "WORLD_OBJECT",
  "NPC",
  "CLUE",
  "TRIGGER",
  "TELEPORT",
  "SPAWN",
  "DUNGEON",
] as const;
export type Category = (typeof categories)[number];
export type Vector = { x: number; y: number; z: number };
export interface WorldTarget {
  id: string;
  name: string;
  type: Category;
  scene: string;
  position: Vector;
  rotation: Vector;
  scale: Vector;
  radius: number;
  interactionType: string;
  tags: string[];
  active: boolean;
  entityId?: string;
}
type Snapshot = { targets: WorldTarget[]; revision: number; canEdit?: boolean; cmsUrl?: string };
type Mode = "PLAYER" | "DEBUG" | "EDITOR";
interface EditorState {
  mode: Mode;
  canEdit: boolean;
  loaded: boolean;
  targets: WorldTarget[];
  saved: string;
  revision: number;
  past: WorldTarget[][];
  future: WorldTarget[][];
  selected: string | null;
  tool: Category | "select";
  transform: "translate" | "rotate" | "scale";
  busy: boolean;
  error: string;
  cmsUrl: string;
  show: Record<string, boolean>;
  load: () => Promise<void>;
  save: () => Promise<boolean>;
  change: (targets: WorldTarget[]) => void;
  update: (id: string, patch: Partial<WorldTarget>) => void;
  undo: () => void;
  redo: () => void;
  place: (position: Vector, entityId?: string) => void;
  remove: () => void;
  duplicate: () => void;
}
const encode = (targets: WorldTarget[]) => JSON.stringify(targets);
export const useWorldEditor = create<EditorState>((set, get) => ({
  mode: "PLAYER",
  canEdit: false,
  loaded: false,
  targets: [],
  saved: "[]",
  revision: 0,
  past: [],
  future: [],
  selected: null,
  tool: "select",
  transform: "translate",
  busy: false,
  error: "",
  cmsUrl: "",
  show: {
    POI: true,
    WORLD_OBJECT: true,
    NPC: true,
    CLUE: true,
    TRIGGER: true,
    TELEPORT: true,
    SPAWN: true,
    DUNGEON: true,
    colliders: false,
    npcIds: false,
    objectIds: false,
    coordinates: false,
  },
  async load() {
    set({ busy: true, error: "" });
    try {
      const s = await worldRequest<Snapshot>("targets");
      set({
        targets: s.targets,
        saved: encode(s.targets),
        revision: s.revision,
        canEdit: !!s.canEdit,
        cmsUrl: s.cmsUrl ?? "",
        loaded: true,
        past: [],
        future: [],
        selected: null,
        ...(!s.canEdit ? { mode: "PLAYER" as const } : {}),
      });
    } catch (e) {
      set({ error: String(e), mode: "PLAYER", canEdit: false });
    } finally {
      set({ busy: false });
    }
  },
  async save() {
    const s = get();
    if (!s.canEdit || s.busy) return false;
    set({ busy: true, error: "" });
    try {
      const result = await worldRequest<Snapshot>("save-targets", {
        targets: s.targets.map((t) => ({ ...t, tags: t.tags.filter(Boolean) })),
        revision: s.revision,
      });
      set({ targets: result.targets, revision: result.revision, saved: encode(result.targets) });
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  change(targets) {
    const s = get();
    if (!s.canEdit || s.busy) return;
    set({ targets, past: [...s.past.slice(-99), s.targets], future: [] });
  },
  update(id, patch) {
    get().change(get().targets.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)));
  },
  undo() {
    const s = get(),
      targets = s.past.at(-1);
    if (!targets || s.busy) return;
    set({ targets, past: s.past.slice(0, -1), future: [s.targets, ...s.future] });
  },
  redo() {
    const s = get(),
      targets = s.future[0];
    if (!targets || s.busy) return;
    set({ targets, past: [...s.past, s.targets], future: s.future.slice(1) });
  },
  place(position, entityId) {
    const s = get();
    if (s.tool === "select" || s.mode !== "EDITOR") return;
    const id = `${s.tool.toLowerCase()}_${crypto.randomUUID()}`;
    s.change([
      ...s.targets,
      {
        id,
        name: `New ${s.tool}`,
        ...(entityId ? { entityId } : {}),
        type: s.tool,
        scene: "toko-cung-world",
        position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        radius: 2,
        interactionType: s.tool === "NPC" ? "TALK" : "VISIT",
        tags: [],
        active: true,
      },
    ]);
    set({ selected: id, tool: "select" });
  },
  remove() {
    const s = get();
    s.change(s.targets.filter((t) => t.id !== s.selected));
    set({ selected: null });
  },
  duplicate() {
    const s = get(),
      t = s.targets.find((t) => t.id === s.selected);
    if (!t) return;
    const id = `${t.type.toLowerCase()}_${crypto.randomUUID()}`;
    s.change([
      ...s.targets,
      {
        ...structuredClone(t),
        id,
        name: `${t.name} copy`,
        position: { ...t.position, x: t.position.x + 1 },
      },
    ]);
    set({ selected: id });
  },
}));
