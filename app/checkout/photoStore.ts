"use client";

import { useSyncExternalStore } from "react";

import {
  clampEdit,
  DEFAULT_EDIT,
  editKey,
  freshEdit,
  isUntouched,
  type Edit,
  type Pixels,
  type SlotNeed,
} from "@/lib/catalog/checkout";
import { photoCount } from "@/lib/catalog/listing";
import { DAY_MS, KEEP_DAYS } from "@/lib/checkout/order";
import { bake, readPhoto, sourceFor, upload } from "./images";

/**
 * The photo step's state: the customer's tray of photos and where each is
 * placed. One small store read with `useSyncExternalStore`, as the cart is.
 *
 * What survives a reload is saved in localStorage: the order's reference and
 * its key, the photos that finished uploading (by their Cloudinary ID) and
 * every placement. A photo still uploading when the page goes is lost, and
 * says so by being absent; its file never left the browser. An order not
 * paid within `KEEP_DAYS` of starting begins again, a few days before the
 * shop's daily sweep (`lib/checkout/uploads.ts`) deletes its photos.
 *
 * A place left as placed goes to the shop as the original upload. A place
 * the customer edited is rendered here at full resolution and uploaded as
 * its own file (`bakes`), keyed by what it shows, so places that come out
 * the same share one.
 */

export type Photo = {
  id: string;
  name: string;
  /** Name, size and date of the file, to catch the same photo picked twice. */
  key: string;
  /** Upright pixel size; null until known. */
  px: Pixels | null;
  status: "reading" | "uploading" | "done" | "error";
  /** Upload progress, 0 to 1. */
  progress: number;
  error?: string;
  publicId?: string;
  version?: number;
  /** A local, downsized copy for this visit only. */
  preview?: string;
};

/** A photo in a slot and how it was set there. */
export type Placed = { photo: string; edit: Edit };

/**
 * One cart line's placements. `sets` holds one set of slots shared by every
 * unit, or with `each`, one set per unit: three mugs, three photos.
 */
export type LineState = {
  each: boolean;
  sets: (Placed | null)[][];
  /** The customer's words, one per set. */
  words: string[];
  /** A frame the customer chose to take without a print. */
  empty?: boolean;
  /** A frame whose print is not on sale online, which the customer asked the shop to quote for. */
  quote?: boolean;
  /** The customer's note to the shop about this line, left at the details step. */
  note?: string;
};

/** An edited place's own file: being rendered and sent, sent, or failed. */
export type Bake = { status: "working" | "done" | "error"; publicId?: string; version?: number; error?: string };

/** Where a slot is: line, set, slot. */
export type At = { sku: string; set: number; slot: number };

export type PhotoState = {
  ref: string;
  /** The ref's secret: placing the order proves it, so nobody else can rewrite it. Never shown. */
  key: string;
  /** When this order's photos began, in ms: past `KEEP_DAYS` it starts over. */
  startedAt: number;
  photos: Photo[];
  lines: Record<string, LineState>;
  /** Edited places' files, by `editKey`. */
  bakes: Record<string, Bake>;
  /** The photo picked up from the tray, waiting to be placed. */
  armed: string | null;
  /** The last thing said to a screen reader, with a counter so a repeat is said again. */
  said: { text: string; n: number };
};

const KEY = "epg:photos:v2";
/** Unclaimed, so dropped: saved before orders had keys. */
const OLD_KEY = "epg:photos:v1";
const SERVER: PhotoState = { ref: "", key: "", startedAt: 0, photos: [], lines: {}, bakes: {}, armed: null, said: { text: "", n: 0 } };
const PARALLEL = 3;

let state: PhotoState | null = null;
let saving: ReturnType<typeof setTimeout> | undefined;
const files = new Map<string, Blob>();
const queue: string[] = [];
let running = 0;
const listeners = new Set<() => void>();

const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * A new order: "EPG-7K2QX9", what the shop finds it and its folder of photos
 * by, and the key that proves this browser made it.
 */
function newOrder() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const ref = `EPG-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => abc[b % abc.length]).join("")}`;
  const key = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  return { ref, key, startedAt: Date.now() };
}

/** An empty order under a new ref. */
const fresh = (): PhotoState => ({ ...SERVER, ...newOrder() });

const EMPTY_LINE: LineState = { each: false, sets: [], words: [] };

/** Every placement of every line passed through `fn`: dropping a removed photo, or one that did not survive. */
const mapPlacements = (lines: Record<string, LineState>, fn: (p: Placed | null) => Placed | null) =>
  Object.fromEntries(Object.entries(lines).map(([sku, l]) => [sku, { ...l, sets: l.sets.map((s) => s.map(fn)) }]));

/** One placement of a line passed through `fn`. */
const withSlot = (l: LineState, t: At, fn: (p: Placed | null) => Placed | null): LineState => ({
  ...l,
  sets: l.sets.map((s, i) => (i === t.set ? s.map((p, j) => (j === t.slot ? fn(p) : p)) : s)),
});

function load(): PhotoState {
  try {
    window.localStorage.removeItem(OLD_KEY);
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    const fresh = typeof raw?.startedAt === "number" && Date.now() - raw.startedAt < KEEP_DAYS * DAY_MS;
    if (fresh && typeof raw.ref === "string" && typeof raw.key === "string" && Array.isArray(raw.photos) && typeof raw.lines === "object") {
      return { ...SERVER, ref: raw.ref, key: raw.key, startedAt: raw.startedAt, photos: raw.photos, lines: raw.lines, bakes: raw.bakes ?? {} };
    }
  } catch {
    // Unreadable: start a fresh order.
  }
  return fresh();
}

function save() {
  const s = current();
  try {
    // The local preview is a blob address that dies with the page, so it is not kept.
    const photos = s.photos.filter((p) => p.status === "done").map((p) => ({ ...p, preview: undefined }));
    // Placements of photos that did not survive point at nothing after a reload; drop them.
    const kept = new Set(photos.map((p) => p.id));
    const lines = mapPlacements(s.lines, (p) => (p && kept.has(p.photo) ? p : null));
    // Only finished renders: one cut short by the page going is simply made again.
    const bakes = Object.fromEntries(Object.entries(s.bakes).filter(([, b]) => b.status === "done"));
    window.localStorage.setItem(KEY, JSON.stringify({ ref: s.ref, key: s.key, startedAt: s.startedAt, photos, lines, bakes }));
  } catch {
    // Private mode or a full disk: the step still works for this visit.
  }
}

const current = () => (state ??= load());

function flush() {
  clearTimeout(saving);
  save();
}

function set(next: Partial<PhotoState>) {
  state = { ...current(), ...next };
  // Saved a moment after the last change, so typing and upload progress do not write on every tick.
  if (next.photos || next.lines || next.ref || next.bakes) {
    clearTimeout(saving);
    saving = setTimeout(save, 300);
    // Leaving the page before the timer fires still saves.
    window.addEventListener("pagehide", flush, { once: true });
  }
  listeners.forEach((fn) => fn());
}

const patchPhoto = (id: string, patch: Partial<Photo>) =>
  set({ photos: current().photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

const say = (text: string) => set({ said: { text, n: current().said.n + 1 } });

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePhotos(): PhotoState {
  return useSyncExternalStore(subscribe, current, () => SERVER);
}

export const photoById = (id: string) => current().photos.find((p) => p.id === id);

/* ---- Uploading ---------------------------------------------------------- */

function pump() {
  while (running < PARALLEL && queue.length > 0) {
    const id = queue.shift()!;
    const blob = files.get(id);
    const photo = photoById(id);
    if (!blob || !photo) {
      files.delete(id);
      continue;
    }
    running++;
    patchPhoto(id, { status: "uploading", progress: 0, error: undefined });
    // Progress in 5% steps: each step redraws the tray and the places using the photo.
    upload(current().ref, blob, photo.name, (p) => {
      const progress = Math.floor(p * 20) / 20;
      if (photoById(id)?.progress !== progress) patchPhoto(id, { progress });
    })
      .then((done) => {
        if (!photoById(id)) return;
        // The local reading wins where there is one: it is the pixels the crop was set on.
        patchPhoto(id, { status: "done", progress: 1, publicId: done.publicId, version: done.version, px: photoById(id)?.px ?? done.px });
        // The file stays for this visit: an edit is rendered from it, not from a preview.
      })
      .catch((e: Error) => {
        if (photoById(id)) patchPhoto(id, { status: "error", error: e.message });
        say(`${photo.name} did not upload. ${e.message}`);
      })
      .finally(() => {
        running--;
        pump();
      });
  }
}

/* ---- Normalising a line ------------------------------------------------- */

/** A line's state shaped to its quantity and slot count, whatever was saved. */
export function shapeLine(l: LineState | undefined, quantity: number, slots: number): LineState {
  const base = l ?? EMPTY_LINE;
  const count = base.each ? quantity : 1;
  const sets = Array.from({ length: count }, (_, i) =>
    Array.from({ length: slots }, (_, j) => base.sets[i]?.[j] ?? null),
  );
  const words = Array.from({ length: count }, (_, i) => base.words[i] ?? "");
  return { ...base, sets, words };
}

function writeLine(sku: string, fn: (l: LineState) => LineState, quantity: number, slots: number) {
  const lines = current().lines;
  set({ lines: { ...lines, [sku]: fn(shapeLine(lines[sku], quantity, slots)) } });
}

/** A slot's target: where, what it needs, and the line's shape, so a placement can be made on its own. */
export type Target = At & { need: SlotNeed; kind: "gift" | "print"; quantity: number; slots: number };

function placeIn(l: LineState, t: Target, photo: Photo): LineState {
  const edit = photo.px ? freshEdit(photo.px, t.need, t.kind) : DEFAULT_EDIT;
  return withSlot(l, t, () => ({ photo: photo.id, edit }));
}

/** Places photos one per target, in order, as one write. */
function placeAll(pairs: { id: string; target: Target }[]) {
  const lines = { ...current().lines };
  for (const { id, target } of pairs) {
    const photo = photoById(id);
    if (photo) lines[target.sku] = placeIn(shapeLine(lines[target.sku], target.quantity, target.slots), target, photo);
  }
  set({ lines });
}

/* ---- Rendering edits --------------------------------------------------- */

type BakeJob = { key: string; photo: string; need: SlotNeed; edit: Edit };
const bakeQueue: BakeJob[] = [];
let baking = false;

const setBake = (key: string, bake: Bake | null) => {
  const bakes = { ...current().bakes };
  if (bake) bakes[key] = bake;
  else delete bakes[key];
  set({ bakes });
};

/** One at a time: each render holds a full-resolution photo in memory. */
async function runBakes() {
  if (baking) return;
  baking = true;
  for (let job = bakeQueue.shift(); job; job = bakeQueue.shift()) {
    const photo = photoById(job.photo);
    try {
      if (!photo?.px) throw new Error("The photo is gone.");
      const source = await sourceFor(files.get(photo.id), photo.publicId, photo.version);
      const blob = await bake(source, photo.px, job.need, job.edit);
      const name = `${photo.name.replace(/\.[^.]+$/, "")}-edited.jpg`;
      const done = await upload(current().ref, blob, name, () => {});
      setBake(job.key, { status: "done", publicId: done.publicId, version: done.version });
    } catch (e) {
      setBake(job.key, { status: "error", error: (e as Error).message });
      say(`An edit to ${photo?.name ?? "a photo"} did not reach the shop.`);
    }
  }
  baking = false;
}

/* ---- Actions ------------------------------------------------------------ */

/** Lets go of every local file and preview, and every upload or render still waiting. */
function dropUploads() {
  for (const p of current().photos) if (p.preview) URL.revokeObjectURL(p.preview);
  files.clear();
  queue.length = 0;
  bakeQueue.length = 0;
}

export const photos = {
  /** Reads, previews and queues each file; returns the IDs added, in order, duplicates left out. */
  add(list: FileList | File[]): string[] {
    const known = new Set(current().photos.map((p) => p.key));
    const added: Photo[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) continue;
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (known.has(key)) continue;
      known.add(key);
      added.push({ id: newId(), name: file.name, key, px: null, status: "reading", progress: 0 });
      files.set(added[added.length - 1].id, file);
    }
    const skipped = Array.from(list).length - added.length;
    if (added.length === 0) {
      if (skipped > 0) say("Those photos are already added.");
      return [];
    }
    set({ photos: [...current().photos, ...added] });
    say(`${photoCount(added.length)} added${skipped > 0 ? `, ${skipped} already there` : ""}. Uploading now.`);

    for (const p of added) {
      const file = files.get(p.id) as File;
      readPhoto(file)
        .then(({ px, preview, upload: blob }) => {
          // Removed while it was being read: let go of the file and its preview.
          if (!photoById(p.id)) {
            if (preview) URL.revokeObjectURL(preview);
            files.delete(p.id);
            return;
          }
          files.set(p.id, blob);
          patchPhoto(p.id, { px, preview: preview ?? undefined });
        })
        .finally(() => {
          queue.push(p.id);
          pump();
        });
    }
    return added.map((p) => p.id);
  },

  retry(id: string) {
    if (!files.has(id)) return;
    queue.push(id);
    pump();
  },

  /** Takes a photo out of the tray and out of every slot it was in. */
  remove(id: string) {
    const s = current();
    const photo = s.photos.find((p) => p.id === id);
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
    files.delete(id);
    const lines = mapPlacements(s.lines, (p) => (p?.photo === id ? null : p));
    set({ photos: s.photos.filter((p) => p.id !== id), lines, armed: s.armed === id ? null : s.armed });
    say(`${photo?.name ?? "Photo"} removed.`);
  },

  /**
   * Renders and sends every edited place not sent yet. Given each filled
   * place with what it needs, by the page, which knows the places' shapes;
   * a place left untouched needs nothing, as the original goes.
   */
  ensureBakes(placements: { photo: string; need: SlotNeed; edit: Edit }[]) {
    const s = current();
    const fresh: Record<string, Bake> = {};
    for (const p of placements) {
      const photo = s.photos.find((x) => x.id === p.photo);
      if (!photo?.px || isUntouched(photo.px, p.need, p.edit)) continue;
      const key = editKey(photo.id, photo.px, p.need, p.edit);
      if (s.bakes[key] || fresh[key]) continue;
      fresh[key] = { status: "working" };
      bakeQueue.push({ key, photo: photo.id, need: p.need, edit: p.edit });
    }
    if (Object.keys(fresh).length === 0) return;
    set({ bakes: { ...s.bakes, ...fresh } });
    runBakes();
  },

  /** Forgets a failed render, so the next pass makes it again. */
  retryBake(key: string) {
    setBake(key, null);
  },

  /**
   * Starts the photos over: every photo out of the tray and out of every
   * place, uploads still waiting dropped. The customer's words, notes and
   * frame choices stay; the cart is untouched.
   */
  reset() {
    dropUploads();
    const lines = Object.fromEntries(
      Object.entries(current().lines).map(([sku, l]) => [sku, { ...l, each: false, sets: [] }]),
    );
    set({ photos: [], lines, bakes: {}, armed: null });
    say("All photos removed. Your order is back to empty places.");
  },

  /**
   * The order is paid: forget its photos, places, words and notes, and start the
   * next order under a new reference. The files stay in Cloudinary for the shop.
   */
  finish() {
    dropUploads();
    set({ ...fresh(), said: current().said });
  },

  arm(id: string | null) {
    set({ armed: id });
    if (id) say(`${photoById(id)?.name ?? "Photo"} picked up. Now choose each place it should go.`);
  },

  /** Places one photo in every target given, each fitted fresh. */
  place(id: string, targets: Target[]) {
    if (targets.length === 0) return;
    placeAll(targets.map((target) => ({ id, target })));
    say(targets.length === 1 ? `Placed in ${targets[0].need.label}.` : `Placed in ${targets.length} places.`);
  },

  /** Places photos one per target, in order: "fill from tray", "one print per photo". */
  placeEach(pairs: { id: string; target: Target }[]) {
    placeAll(pairs);
    say(`${photoCount(pairs.length)} placed.`);
  },

  clear(t: Target) {
    writeLine(t.sku, (l) => withSlot(l, t, () => null), t.quantity, t.slots);
    say(`${t.need.label} emptied.`);
  },

  /** Saves an editor's result to one slot, or to several that share its photo and shape. */
  edit(targets: Target[], edit: Edit) {
    const lines = { ...current().lines };
    for (const t of targets) {
      const l = shapeLine(lines[t.sku], t.quantity, t.slots);
      const photo = l.sets[t.set][t.slot];
      const px = photo ? photoById(photo.photo)?.px : null;
      if (!photo) continue;
      const fixed = px ? clampEdit(px, t.need, edit) : edit;
      lines[t.sku] = withSlot(l, t, (p) => p && { ...p, edit: fixed });
    }
    set({ lines });
  },

  /** Same photos on every unit, or a different set on each; switching keeps the first set. */
  setEach(sku: string, each: boolean, quantity: number, slots: number) {
    // Turning it on copies the shared set to every unit, as a starting point to change.
    const copies = (n: number) => Array.from({ length: n });
    writeLine(
      sku,
      (l) =>
        each
          ? { ...l, each, sets: copies(quantity).map(() => [...l.sets[0]]), words: copies(quantity).map(() => l.words[0]) }
          : { ...l, each, sets: l.sets.slice(0, 1), words: l.words.slice(0, 1) },
      quantity,
      slots,
    );
  },

  setWords(sku: string, set: number, text: string, quantity: number, slots: number) {
    writeLine(sku, (l) => ({ ...l, words: l.words.map((w, i) => (i === set ? text : w)) }), quantity, slots);
  },

  /** A frame's choice (take it empty, or ask for a quote on its print), or the line's note to the shop. */
  flag(sku: string, patch: Pick<LineState, "empty" | "quote" | "note">) {
    const lines = current().lines;
    set({ lines: { ...lines, [sku]: { ...(lines[sku] ?? EMPTY_LINE), ...patch } } });
  },

  /** Carries a line's photos across to another variant of it (one photo to two), in slot order. */
  move(from: string, to: string) {
    const lines = { ...current().lines };
    if (!lines[from]) return;
    lines[to] = { ...lines[from], sets: lines[from].sets.map((s) => s.map((p) => (p ? { ...p, edit: { ...p.edit, zoom: 0, x: 0.5, y: 0.5 } } : p))) };
    delete lines[from];
    set({ lines });
  },

  /** Replaces a line's state whole: one print per photo. */
  setLine(sku: string, line: LineState) {
    set({ lines: { ...current().lines, [sku]: line } });
  },

  say,
};
