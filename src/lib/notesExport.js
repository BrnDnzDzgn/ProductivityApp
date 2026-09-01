import {
  allDocs,
  childrenOf,
  countNotebooks,
  countPages,
  pathOf,
  readDoc,
  replaceAll,
} from "./notes.js";

/**
 * Getting notes out, and back in.
 *
 * Notes live in one browser and nowhere else, which is the whole reason this
 * file is not optional. Two formats, because they answer different questions:
 *
 * - **JSON** is canonical. It carries the tree and every body exactly, and it
 *   is what import reads. This is the backup.
 * - **Markdown** is the readable one — one file, every page under its full
 *   path, openable in anything. This is the copy that outlives Orbit.
 *
 * Neither rewrites a single character of what somebody typed. `**bold**` is
 * not markup here, it is four asterisks and a word, and it comes out the way
 * it went in. Nothing is stripped, escaped, or "fixed" on the way to the file.
 */

export const FORMAT = "orbit-notes";
export const FORMAT_VERSION = 1;

const BLOCK_PREFIX = { h1: "# ", h2: "## ", li: "- ", p: "" };

const untitled = (node) =>
  node.title.trim() || (node.type === "notebook" ? "Untitled notebook" : "Untitled page");

/** A node's full path, e.g. "Work / Q3 planning / Retro". */
export const formatPath = (state, id) =>
  pathOf(state, id)
    .map((node) => untitled(node))
    .join(" / ");

/**
 * One page's blocks as Markdown.
 *
 * Consecutive bullets stay on adjacent lines so they read as one list; every
 * other pair of blocks is separated by a blank line, which is what keeps
 * paragraphs from running together when something else renders this.
 */
export function docToMarkdown(doc) {
  const lines = [];
  doc.blocks.forEach((block, index) => {
    const previous = doc.blocks[index - 1];
    if (previous && !(previous.type === "li" && block.type === "li")) lines.push("");
    lines.push(BLOCK_PREFIX[block.type] + block.text);
  });
  return lines.join("\n").trim();
}

/**
 * The whole tree as one Markdown document.
 *
 * Every node is emitted in depth-first order under a `>` path line. The marker
 * matters: content blocks can only ever begin with `# `, `## `, `- `, or plain
 * text, so a quoted line is the one thing a page body cannot produce, and the
 * structure stays unambiguous no matter what anyone writes.
 */
export function toMarkdown(state, now = Date.now()) {
  const notebooks = countNotebooks(state);
  const pages = countPages(state);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const out = [
    "# Orbit notes",
    "",
    `Exported ${new Date(now).toLocaleString()} · ${plural(notebooks, "notebook")}, ${plural(pages, "page")}.`,
    "",
    "These notes were kept in a single browser's local storage. This file is the copy that isn't.",
  ];

  const walk = (parentId) => {
    for (const node of childrenOf(state, parentId)) {
      const children = childrenOf(state, node.id);
      // A notebook holding pages needs no entry of its own — its name is in
      // the path of everything under it. One with nothing inside does, or it
      // would disappear from the file entirely.
      const emit = node.type === "page" || children.length === 0;

      if (emit) {
        out.push("", "---", "", `> ${formatPath(state, node.id)}`, "");
        if (node.type === "page") {
          out.push(docToMarkdown(readDoc(node.id)) || "_This page is empty._");
        } else {
          out.push("_This notebook is empty._");
        }
      }
      walk(node.id);
    }
  };
  walk(null);

  return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

/** The complete, re-importable record. */
export function toJSON(state, now = Date.now()) {
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date(now).toISOString(),
    nodes: state.nodes,
    docs: allDocs(state),
  };
}

/**
 * Reads an exported file back. Returns what it found rather than applying it,
 * so the tool can say what is about to be replaced before anything is.
 */
export function parseImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (!parsed || parsed.format !== FORMAT) {
    return { ok: false, error: "That doesn't look like an Orbit notes export." };
  }
  if (!parsed.nodes || typeof parsed.nodes !== "object") {
    return { ok: false, error: "That export has no notes in it." };
  }

  const nodes = {};
  for (const raw of Object.values(parsed.nodes)) {
    if (!raw || typeof raw.id !== "string" || !raw.id) continue;
    nodes[raw.id] = raw;
  }

  const notebooks = Object.values(nodes).filter((n) => n.type === "notebook").length;
  const pages = Object.values(nodes).filter((n) => n.type !== "notebook").length;

  return {
    ok: true,
    nodes,
    docs: parsed.docs && typeof parsed.docs === "object" ? parsed.docs : {},
    notebooks,
    pages,
  };
}

/** Applies a parsed import, replacing everything currently stored. */
export function applyImport(parsed) {
  replaceAll(parsed.nodes, parsed.docs);
}

/**
 * Hands the browser a file. An object URL rather than a data: URI so a large
 * export doesn't have to survive being encoded into an attribute.
 */
export function downloadFile(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked on the next turn of the loop; revoking synchronously can beat the
  // download starting in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const exportFilename = (extension, now = Date.now()) => {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `orbit-notes-${date.getFullYear()}-${month}-${day}.${extension}`;
};
