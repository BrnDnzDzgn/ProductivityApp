import { createStore, useStore } from "./store.js";
import { load, remove, save } from "./storage.js";

/**
 * Notes — notebooks, pages, and sub-pages to any depth.
 *
 * Two things make this store unlike every other one in Orbit, and both come
 * from the same fact: notes are unbounded prose where everything else is a
 * handful of small records.
 *
 * **The tree and the writing are stored apart.** `orbit:notes.tree` holds the
 * structure only — ids, titles, parents — and changes just when something is
 * created, renamed, moved, or deleted. Each page's body lives under its own
 * `orbit:notes.doc.<id>`. If the whole corpus shared one key, every keystroke
 * would re-serialise every note somebody had ever written, on the main thread,
 * getting slower the more they wrote.
 *
 * **The tree is flat, with parent pointers.** Arbitrary depth is then free —
 * depth is only how far you follow `parentId` — and renaming or re-parenting
 * touches one record instead of rewriting a nested structure. It is also the
 * shape dailies and goals already use for nesting.
 *
 * Because nothing in Orbit enumerates storage keys, the tree is the only index
 * of which `doc.<id>` keys exist. Documents are therefore always removed with
 * their node, never separately.
 */
const TREE_KEY = "notes.tree";
const DOC_PREFIX = "notes.doc.";

const VERSION = 1;

export const TITLE_MAX = 120;
export const BLOCK_TYPES = ["h1", "h2", "p", "li"];

// Deep enough for any real hierarchy, shallow enough that a corrupted parent
// pointer cannot spin a walk forever.
const MAX_DEPTH = 100;

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const docKey = (id) => DOC_PREFIX + id;

/* --- Storage health --------------------------------------------------------
   The one store in the product that can plausibly fill localStorage. A write
   that fails must be visible: silently not saving is the worst thing a notes
   tool can do, so the failure is held here and the tool says so plainly. */

export const healthStore = createStore({ key: null, initial: { failed: false } });

function noteWrite(ok) {
  if (ok) {
    if (healthStore.get().failed) healthStore.set({ failed: false });
  } else if (!healthStore.get().failed) {
    healthStore.set({ failed: true });
  }
  return ok;
}

export const useStorageHealth = () => useStore(healthStore);

/* --- The tree -------------------------------------------------------------- */

function sanitizeNode(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || !raw.id) return null;

  const type = raw.type === "notebook" ? "notebook" : "page";
  const title = typeof raw.title === "string" ? raw.title.slice(0, TITLE_MAX) : "";

  return {
    id: raw.id,
    type,
    // A notebook is the top of the tree by definition; anything else keeps
    // whatever parent it claims, resolved against the tree on read.
    parentId: type === "notebook" ? null : typeof raw.parentId === "string" ? raw.parentId : null,
    title,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
  };
}

function hydrate(stored) {
  if (!stored || typeof stored !== "object" || !stored.nodes) return { nodes: {} };

  const nodes = {};
  for (const raw of Object.values(stored.nodes)) {
    const node = sanitizeNode(raw);
    if (node) nodes[node.id] = node;
  }

  // A page whose parent did not survive would be unreachable from the tree and
  // therefore invisible. Promoting it to a notebook keeps the writing findable.
  for (const node of Object.values(nodes)) {
    if (node.type === "page" && node.parentId && !nodes[node.parentId]) node.parentId = null;
    if (node.type === "page" && node.parentId === null) node.type = "notebook";
  }

  return { nodes };
}

export const notesStore = createStore({
  key: TREE_KEY,
  initial: { nodes: {} },
  hydrate,
  serialize: (state) => ({ version: VERSION, ...state }),
});

// Only ever write an empty tree when nothing is stored, for the same reason
// dailies does: two tabs opening at once must not let an empty one win.
if (Object.keys(notesStore.get().nodes).length > 0 || load(TREE_KEY, null) === null) {
  noteWrite(notesStore.checkpoint());
}

export const useNotes = () => useStore(notesStore);

/* --- Reading the tree ------------------------------------------------------ */

/** Direct children of a node, oldest first. `null` gives the notebooks. */
export function childrenOf(state, parentId) {
  return Object.values(state.nodes)
    .filter((node) => (parentId === null ? node.type === "notebook" : node.parentId === parentId))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Every node beneath one, depth first. Does not include the node itself. */
export function descendantsOf(state, id) {
  const out = [];
  const walk = (parentId, depth) => {
    if (depth > MAX_DEPTH) return;
    for (const child of childrenOf(state, parentId)) {
      out.push(child);
      walk(child.id, depth + 1);
    }
  };
  walk(id, 0);
  return out;
}

/** The chain from the notebook down to this node, inclusive. */
export function pathOf(state, id) {
  const path = [];
  let cursor = state.nodes[id];
  let depth = 0;
  while (cursor && depth < MAX_DEPTH) {
    path.unshift(cursor);
    cursor = cursor.parentId ? state.nodes[cursor.parentId] : null;
    depth += 1;
  }
  return path;
}

/** Whether `id` sits anywhere beneath `ancestorId`. Guards moves against cycles. */
export function isDescendantOf(state, id, ancestorId) {
  let cursor = state.nodes[id];
  let depth = 0;
  while (cursor && depth < MAX_DEPTH) {
    if (cursor.parentId === ancestorId) return true;
    cursor = cursor.parentId ? state.nodes[cursor.parentId] : null;
    depth += 1;
  }
  return false;
}

export const countPages = (state) =>
  Object.values(state.nodes).filter((node) => node.type === "page").length;

export const countNotebooks = (state) =>
  Object.values(state.nodes).filter((node) => node.type === "notebook").length;

/* --- Writing the tree ------------------------------------------------------ */

function commit(nodes) {
  notesStore.set({ nodes });
  noteWrite(notesStore.checkpoint());
}

export function addNotebook(title = "") {
  const node = {
    id: newId(),
    type: "notebook",
    parentId: null,
    title: title.slice(0, TITLE_MAX),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  commit({ ...notesStore.get().nodes, [node.id]: node });
  return node.id;
}

export function addPage(parentId, title = "") {
  const state = notesStore.get();
  if (!state.nodes[parentId]) return null;

  const node = {
    id: newId(),
    type: "page",
    parentId,
    title: title.slice(0, TITLE_MAX),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  commit({ ...state.nodes, [node.id]: node });
  return node.id;
}

export function renameNode(id, title) {
  const state = notesStore.get();
  const node = state.nodes[id];
  if (!node) return;
  commit({
    ...state.nodes,
    [id]: { ...node, title: String(title).slice(0, TITLE_MAX), updatedAt: Date.now() },
  });
}

/**
 * Re-files a node. Refused when the destination sits inside the node being
 * moved: parent pointers make that a ring, and a ring is a set of pages that
 * can never be reached from the tree again.
 */
export function moveNode(id, parentId) {
  const state = notesStore.get();
  const node = state.nodes[id];
  if (!node || id === parentId) return false;
  if (parentId !== null && !state.nodes[parentId]) return false;
  if (parentId !== null && isDescendantOf(state, parentId, id)) return false;

  commit({
    ...state.nodes,
    [id]: {
      ...node,
      type: parentId === null ? "notebook" : "page",
      parentId,
      updatedAt: Date.now(),
    },
  });
  return true;
}

/**
 * Removes a node and everything under it, returning the whole subtree —
 * documents included — so undo restores the writing and not just the outline.
 * Bodies are read before anything is deleted, so a failure part-way through
 * cannot leave the snapshot short of what it needs to put back.
 */
export function removeSubtree(id) {
  const state = notesStore.get();
  const node = state.nodes[id];
  if (!node) return null;

  const doomed = [node, ...descendantsOf(state, id)];
  const docs = {};
  for (const target of doomed) {
    const doc = readDoc(target.id);
    if (doc.blocks.some((block) => block.text.trim())) docs[target.id] = doc;
  }

  const nodes = { ...state.nodes };
  for (const target of doomed) {
    delete nodes[target.id];
    remove(docKey(target.id));
    docCache.delete(target.id);
    pending.delete(target.id);
  }
  commit(nodes);

  return { nodes: doomed, docs };
}

/** Puts a deleted subtree back, writing every body it held. */
export function restoreSubtree(snapshot) {
  if (!snapshot) return;
  const nodes = { ...notesStore.get().nodes };
  for (const node of snapshot.nodes) nodes[node.id] = node;
  for (const [id, doc] of Object.entries(snapshot.docs)) {
    docCache.set(id, doc);
    noteWrite(save(docKey(id), doc));
  }
  commit(nodes);
}

/* --- Documents -------------------------------------------------------------
   One key per page, written on a short delay while typing and flushed the
   moment focus leaves, the page changes, or the tab does. */

const docCache = new Map();
const pending = new Map();
let flushTimer = null;

const WRITE_DELAY = 500;

export const emptyDoc = () => ({ blocks: [{ type: "p", text: "" }] });

function sanitizeDoc(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.blocks)) return emptyDoc();
  const blocks = raw.blocks
    .filter((block) => block && typeof block === "object")
    .map((block) => ({
      type: BLOCK_TYPES.includes(block.type) ? block.type : "p",
      // Stored exactly as typed. Anything that looks like markup — `**bold**`,
      // a stray backtick — is somebody's literal text and is never rewritten.
      text: typeof block.text === "string" ? block.text : "",
    }));
  return blocks.length > 0 ? { blocks } : emptyDoc();
}

export function readDoc(id) {
  if (pending.has(id)) return pending.get(id);
  if (docCache.has(id)) return docCache.get(id);
  const doc = sanitizeDoc(load(docKey(id), null));
  docCache.set(id, doc);
  return doc;
}

/** Records an edit. Held in memory and written on a delay so typing is cheap. */
export function writeDoc(id, doc) {
  const clean = sanitizeDoc(doc);
  docCache.set(id, clean);
  pending.set(id, clean);
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushDocs, WRITE_DELAY);
  return clean;
}

export function flushDocs() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  for (const [id, doc] of pending) noteWrite(save(docKey(id), doc));
  pending.clear();
}

// A tab closing mid-sentence should still keep the sentence.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeunload", flushDocs);
}

/* --- Block operations ------------------------------------------------------
   The editor's whole vocabulary, as pure functions over a block array. They
   live here rather than inside the component because they are data
   transformations with exact right answers, and because a keystroke that
   silently mangles a paragraph is the kind of bug that has to be testable. */

/** Markdown prefixes that promote a block as it is typed. */
const SHORTCUTS = [
  [/^# /, "h1"],
  [/^## /, "h2"],
  [/^[-*] /, "li"],
];

/**
 * What a block becomes when its text changes. A recognised prefix promotes the
 * block and is consumed; everything else is kept exactly as typed, including
 * anything that merely looks like markup.
 */
export function applyTyping(block, value) {
  for (const [pattern, type] of SHORTCUTS) {
    if (pattern.test(value)) return { type, text: value.replace(pattern, "") };
  }
  return { ...block, text: value };
}

/**
 * Enter. Splits a block at the cursor, carrying the tail into a new one below.
 * A bullet makes another bullet, so a list keeps going; Enter on an *empty*
 * bullet ends the list instead, which is what every editor does and what
 * everyone's fingers expect.
 */
export function splitBlock(blocks, index, caret) {
  const block = blocks[index];
  const out = [...blocks];

  if (block.type === "li" && block.text === "") {
    out[index] = { type: "p", text: "" };
    return { blocks: out, caret: { index, at: 0 } };
  }

  const before = block.text.slice(0, caret);
  const after = block.text.slice(caret);
  out[index] = { ...block, text: before };
  out.splice(index + 1, 0, { type: block.type === "li" ? "li" : "p", text: after });
  return { blocks: out, caret: { index: index + 1, at: 0 } };
}

/**
 * Backspace at the very start of a block, once it is already a paragraph:
 * the block joins the end of the one above it and the cursor lands on the
 * seam. Returns null at the top of a page, where there is nothing to join.
 */
export function mergeBackward(blocks, index) {
  if (index <= 0) return null;
  const previous = blocks[index - 1];
  const out = [...blocks];
  out[index - 1] = { ...previous, text: previous.text + blocks[index].text };
  out.splice(index, 1);
  return { blocks: out, caret: { index: index - 1, at: previous.text.length } };
}

/** Backspace at the start of a heading or bullet drops it to a paragraph first. */
export function demoteBlock(blocks, index) {
  const out = [...blocks];
  out[index] = { ...out[index], type: "p" };
  return out;
}

/** Every document in the tree, for export. */
export function allDocs(state) {
  const docs = {};
  for (const node of Object.values(state.nodes)) {
    if (node.type !== "page") continue;
    const doc = readDoc(node.id);
    if (doc.blocks.some((block) => block.text.trim())) docs[node.id] = doc;
  }
  return docs;
}

/** Replaces the entire tree and every body. Used only by import. */
export function replaceAll(nodes, docs) {
  const state = notesStore.get();
  for (const node of Object.values(state.nodes)) {
    remove(docKey(node.id));
    docCache.delete(node.id);
    pending.delete(node.id);
  }

  for (const [id, doc] of Object.entries(docs)) {
    const clean = sanitizeDoc(doc);
    docCache.set(id, clean);
    noteWrite(save(docKey(id), clean));
  }
  commit(nodes);
}
