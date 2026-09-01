import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Notebook,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  TITLE_MAX,
  addNotebook,
  addPage,
  applyTyping,
  childrenOf,
  demoteBlock,
  descendantsOf,
  flushDocs,
  mergeBackward,
  pathOf,
  readDoc,
  removeSubtree,
  renameNode,
  restoreSubtree,
  splitBlock,
  useNotes,
  useStorageHealth,
  writeDoc,
} from "../lib/notes.js";
import {
  applyImport,
  docToMarkdown,
  downloadFile,
  exportFilename,
  parseImport,
  toJSON,
  toMarkdown,
} from "../lib/notesExport.js";
import "./Notes.css";

const UNDO_MS = 9000;

const displayTitle = (node) =>
  node.title.trim() || (node.type === "notebook" ? "Untitled notebook" : "Untitled page");

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Notes() {
  const notes = useNotes();
  const health = useStorageHealth();

  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [renamingId, setRenamingId] = useState(null);
  const [undo, setUndo] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [importing, setImporting] = useState(null);
  const undoTimer = useRef(null);
  const fileRef = useRef(null);

  // Resolved through the tree rather than mirrored into state, so a deleted
  // page falls back to the welcome on its own — and comes straight back if the
  // deletion is undone.
  const selected = selectedId ? (notes.nodes[selectedId] ?? null) : null;

  useEffect(() => () => clearTimeout(undoTimer.current), []);
  // Anything still held back from storage is written when the tool goes away.
  useEffect(() => flushDocs, []);

  const expand = useCallback((id) => {
    setExpanded((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const toggle = (id) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const open = (id) => {
    flushDocs();
    setSelectedId(id);
  };

  const handleNewNotebook = () => {
    const id = addNotebook("");
    setSelectedId(id);
    setRenamingId(id);
  };

  const handleNewPage = (parentId) => {
    const id = addPage(parentId, "");
    if (!id) return;
    expand(parentId);
    flushDocs();
    setSelectedId(id);
    setRenamingId(id);
  };

  // A bare page goes immediately and is undoable, like everything else in the
  // product. A node with pages inside it asks first: nine seconds is not a real
  // reprieve for a notebook holding a month of writing, and DESIGN.md §4 wants
  // a confirmation on anything genuinely irreversible.
  const requestDelete = (node) => {
    const count = descendantsOf(notes, node.id).length;
    if (count > 0) setConfirming({ node, count });
    else performDelete(node);
  };

  const performDelete = (node) => {
    setConfirming(null);
    clearTimeout(undoTimer.current);
    const snapshot = removeSubtree(node.id);
    if (!snapshot) return;
    setUndo({ snapshot, node });
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    clearTimeout(undoTimer.current);
    if (undo) restoreSubtree(undo.snapshot);
    setUndo(null);
  };

  const exportJSON = () => {
    flushDocs();
    downloadFile(exportFilename("json"), JSON.stringify(toJSON(notes), null, 2), "application/json");
  };

  const exportMarkdown = () => {
    flushDocs();
    downloadFile(exportFilename("md"), toMarkdown(notes), "text/markdown");
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const parsed = parseImport(await file.text());
    setImporting(parsed.ok ? parsed : { ok: false, error: parsed.error });
  };

  const notebooks = childrenOf(notes, null);

  return (
    <div className="notes">
      {health.failed && (
        <div className="notes-alarm" role="alert">
          <strong>This browser is out of space, so your last edits were not saved.</strong> Export
          your notes now, then free some space or remove a few pages.
          <button type="button" className="text-button" onClick={exportJSON}>
            Export now
          </button>
        </div>
      )}

      <div className="notes-body">
        <nav className="tree" aria-label="Notebooks and pages">
          <div className="tree-head">
            <span className="tree-title">Notebooks</span>
            <button
              type="button"
              className="button button--primary tree-new"
              onClick={handleNewNotebook}
            >
              <Plus size={16} aria-hidden="true" />
              New
            </button>
          </div>

          {notebooks.length === 0 ? (
            <p className="tree-empty">No notebooks yet.</p>
          ) : (
            <ul className="tree-list">
              {notebooks.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  notes={notes}
                  depth={0}
                  selectedId={selectedId}
                  expanded={expanded}
                  renamingId={renamingId}
                  onOpen={open}
                  onToggle={toggle}
                  onRename={setRenamingId}
                  onNewPage={handleNewPage}
                  onDelete={requestDelete}
                />
              ))}
            </ul>
          )}

          {/* Always visible, never behind a menu: this is the tool's only real
              safety net, so it does not get to be hard to find. */}
          <div className="tree-foot">
            <p className="tree-note">
              These notes live only in this browser. Clearing site data removes them, and nothing
              syncs anywhere. Keep a copy.
            </p>
            <div className="tree-actions">
              <button type="button" className="text-button" onClick={exportJSON}>
                <Download size={14} aria-hidden="true" />
                Export all
              </button>
              <button type="button" className="text-button" onClick={exportMarkdown}>
                <FileText size={14} aria-hidden="true" />
                Markdown
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} aria-hidden="true" />
                Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="tree-file"
                onChange={handleFile}
              />
            </div>
          </div>
        </nav>

        <div className="canvas-wrap" data-open={String(Boolean(selected))}>
          {selected ? (
            selected.type === "page" ? (
              <Page key={selected.id} node={selected} notes={notes} onOpen={open} />
            ) : (
              <Shelf node={selected} notes={notes} onOpen={open} onNewPage={handleNewPage} />
            )
          ) : (
            <Welcome hasNotebooks={notebooks.length > 0} onNew={handleNewNotebook} />
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmDelete
          node={confirming.node}
          count={confirming.count}
          onCancel={() => setConfirming(null)}
          onConfirm={() => performDelete(confirming.node)}
        />
      )}

      {importing && (
        <ConfirmImport
          parsed={importing}
          notes={notes}
          onCancel={() => setImporting(null)}
          onConfirm={() => {
            applyImport(importing);
            setImporting(null);
            setSelectedId(null);
          }}
        />
      )}

      {undo && (
        <div className="undo notes-undo" role="status">
          <span className="undo-text">
            Deleted &ldquo;{displayTitle(undo.node)}&rdquo;
            {undo.snapshot.nodes.length > 1 &&
              ` and ${plural(undo.snapshot.nodes.length - 1, "page")} inside it`}
          </span>
          <button type="button" className="text-button" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

/* --- The tree -------------------------------------------------------------- */

function TreeNode({
  node,
  notes,
  depth,
  selectedId,
  expanded,
  renamingId,
  onOpen,
  onToggle,
  onRename,
  onNewPage,
  onDelete,
}) {
  const children = childrenOf(notes, node.id);
  const isOpen = expanded.has(node.id);
  const renaming = renamingId === node.id;

  return (
    <li className="tree-item">
      <div
        className="tree-row"
        data-current={String(node.id === selectedId)}
        style={{ "--depth": depth }}
      >
        <button
          type="button"
          className="tree-twist"
          onClick={() => onToggle(node.id)}
          aria-label={isOpen ? `Collapse ${displayTitle(node)}` : `Expand ${displayTitle(node)}`}
          aria-expanded={isOpen}
          disabled={children.length === 0}
        >
          {children.length > 0 &&
            (isOpen ? (
              <ChevronDown size={14} aria-hidden="true" />
            ) : (
              <ChevronRight size={14} aria-hidden="true" />
            ))}
        </button>

        <span className="tree-icon" aria-hidden="true">
          {node.type === "notebook" ? <Notebook size={14} /> : <FileText size={14} />}
        </span>

        {renaming ? (
          <InlineRename node={node} onDone={() => onRename(null)} />
        ) : (
          <button
            type="button"
            className="tree-label"
            onClick={() => onOpen(node.id)}
            onDoubleClick={() => onRename(node.id)}
            title={displayTitle(node)}
          >
            {displayTitle(node)}
          </button>
        )}

        <span className="tree-row-actions">
          <button
            type="button"
            className="icon-button icon-button--tiny"
            onClick={() => onNewPage(node.id)}
            aria-label={`New page in ${displayTitle(node)}`}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button icon-button--tiny icon-button--danger"
            onClick={() => onDelete(node)}
            aria-label={`Delete ${displayTitle(node)}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </span>
      </div>

      {isOpen && children.length > 0 && (
        <ul className="tree-list">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              notes={notes}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              renamingId={renamingId}
              onOpen={onOpen}
              onToggle={onToggle}
              onRename={onRename}
              onNewPage={onNewPage}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function InlineRename({ node, onDone }) {
  const [value, setValue] = useState(node.title);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    renameNode(node.id, value);
    onDone();
  };

  return (
    <input
      ref={ref}
      className="tree-rename"
      value={value}
      maxLength={TITLE_MAX}
      placeholder={node.type === "notebook" ? "Notebook name" : "Page title"}
      aria-label="Name"
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onDone();
        }
      }}
    />
  );
}

/* --- A notebook: a shelf, not a page --------------------------------------- */

function Shelf({ node, notes, onOpen, onNewPage }) {
  const pages = childrenOf(notes, node.id);

  return (
    <div className="canvas">
      <div className="page-head">
        <Breadcrumb notes={notes} id={node.id} onOpen={onOpen} />
        <TitleField key={node.id} node={node} />
      </div>

      {pages.length === 0 ? (
        <p className="shelf-empty">Nothing in this notebook yet.</p>
      ) : (
        <ul className="shelf-list">
          {pages.map((page) => (
            <li key={page.id}>
              <button type="button" className="shelf-item" onClick={() => onOpen(page.id)}>
                <FileText size={15} aria-hidden="true" />
                {displayTitle(page)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="text-button shelf-new" onClick={() => onNewPage(node.id)}>
        <Plus size={14} aria-hidden="true" />
        New page
      </button>
    </div>
  );
}

/* --- A page ---------------------------------------------------------------- */

function Page({ node, notes, onOpen }) {
  const [doc, setDoc] = useState(() => readDoc(node.id));
  const [copied, setCopied] = useState(false);
  const focusRef = useRef(null);

  // Leaving the page writes whatever hasn't been written yet.
  useEffect(() => flushDocs, [node.id]);

  const update = (blocks) => {
    const next = writeDoc(node.id, { blocks });
    setDoc(next);
  };

  const copyMarkdown = async () => {
    flushDocs();
    try {
      await navigator.clipboard.writeText(docToMarkdown(readDoc(node.id)));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* a browser that refuses the clipboard leaves the export buttons */
    }
  };

  return (
    <div className="canvas">
      <div className="page-head">
        <Breadcrumb notes={notes} id={node.id} onOpen={onOpen} />
        <div className="page-head-row">
          <TitleField key={node.id} node={node} />
          {/* Selection can't cross two textareas, so taking the whole page at
              once needs its own affordance — and it stays in the open. */}
          <button type="button" className="text-button page-copy" onClick={copyMarkdown}>
            <Copy size={14} aria-hidden="true" />
            {copied ? "Copied" : "Copy as Markdown"}
          </button>
        </div>
      </div>

      <Editor doc={doc} onChange={update} focusRef={focusRef} />
    </div>
  );
}

function Breadcrumb({ notes, id, onOpen }) {
  const path = pathOf(notes, id).slice(0, -1);
  if (path.length === 0) return null;
  return (
    <nav className="crumbs" aria-label="Location">
      {path.map((node) => (
        <button key={node.id} type="button" className="crumb" onClick={() => onOpen(node.id)}>
          {displayTitle(node)}
        </button>
      ))}
    </nav>
  );
}

/** Keyed by node id by its callers, so it re-initialises instead of syncing. */
function TitleField({ node }) {
  const [value, setValue] = useState(node.title);

  return (
    <input
      className="page-title"
      value={value}
      maxLength={TITLE_MAX}
      placeholder={node.type === "notebook" ? "Untitled notebook" : "Untitled page"}
      aria-label="Title"
      onChange={(event) => {
        setValue(event.target.value);
        renameNode(node.id, event.target.value);
      }}
    />
  );
}

/* --- The editor ------------------------------------------------------------
   One controlled textarea per block. No contenteditable anywhere: the blocks a
   page can hold are headings, paragraphs, and bullets, and block-level
   formatting needs no selection API, no execCommand, and no paste rescue. */

function Editor({ doc, onChange, focusRef }) {
  const refs = useRef(new Map());
  // Where the cursor should land after a structural edit — a block that was
  // split, or one that merged into the block above. Held in a ref rather than
  // state: it is a one-shot instruction to the DOM, not something to render.
  const caret = useRef(null);

  useEffect(() => {
    const target = caret.current;
    if (!target) return;
    caret.current = null;
    const el = refs.current.get(target.index);
    if (!el) return;
    el.focus();
    const at = target.at === "end" ? el.value.length : target.at;
    el.setSelectionRange(at, at);
  });

  const handleInput = (index, value) => {
    const next = applyTyping(doc.blocks[index], value);
    onChange(doc.blocks.map((block, i) => (i === index ? next : block)));
  };

  const handleKeyDown = (event, index) => {
    const el = event.target;
    const block = doc.blocks[index];

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const result = splitBlock(doc.blocks, index, el.selectionStart);
      onChange(result.blocks);
      caret.current = result.caret;
      return;
    }

    if (event.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (block.type !== "p") {
        event.preventDefault();
        onChange(demoteBlock(doc.blocks, index));
        return;
      }
      const result = mergeBackward(doc.blocks, index);
      if (result) {
        event.preventDefault();
        onChange(result.blocks);
        caret.current = result.caret;
      }
      return;
    }

    if (event.key === "ArrowUp" && el.selectionStart === 0 && index > 0) {
      event.preventDefault();
      caret.current = { index: index - 1, at: "end" };
      return;
    }

    if (
      event.key === "ArrowDown" &&
      el.selectionStart === el.value.length &&
      index < doc.blocks.length - 1
    ) {
      event.preventDefault();
      caret.current = { index: index + 1, at: 0 };
    }
  };

  return (
    <div className="editor" ref={focusRef}>
      {doc.blocks.map((block, index) => (
        <Block
          // Blocks are positional; a stable id per block would have to be
          // stored, and nothing else needs one.
          key={index}
          block={block}
          index={index}
          first={index === 0}
          only={doc.blocks.length === 1}
          registerRef={(el) => {
            if (el) refs.current.set(index, el);
            else refs.current.delete(index);
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />
      ))}
    </div>
  );
}

function Block({ block, index, first, only, registerRef, onInput, onKeyDown }) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(resize, [block.text, block.type, resize]);

  const placeholder = only && !block.text ? "Start writing. # for a heading, - for a bullet." : "";

  return (
    <div className="block" data-type={block.type}>
      {block.type === "li" && <span className="block-bullet" aria-hidden="true" />}
      <textarea
        ref={(el) => {
          ref.current = el;
          registerRef(el);
        }}
        className="block-input"
        rows={1}
        value={block.text}
        placeholder={placeholder}
        aria-label={first ? "Note content" : undefined}
        onChange={(event) => {
          onInput(index, event.target.value);
          resize();
        }}
        onKeyDown={(event) => onKeyDown(event, index)}
        onBlur={flushDocs}
      />
    </div>
  );
}

/* --- Dialogs and the welcome ----------------------------------------------- */

function ConfirmDelete({ node, count, onCancel, onConfirm }) {
  return (
    <Dialog title={`Delete “${displayTitle(node)}”?`} onCancel={onCancel}>
      <p className="dialog-body">
        It holds {plural(count, "page")}, and they go with it. You can undo for nine seconds
        afterwards &mdash; after that this cannot be recovered.
      </p>
      <div className="dialog-actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Keep it
        </button>
        <button type="button" className="button button--danger" onClick={onConfirm}>
          Delete {plural(count + 1, "item")}
        </button>
      </div>
    </Dialog>
  );
}

function ConfirmImport({ parsed, notes, onCancel, onConfirm }) {
  const existing = Object.keys(notes.nodes).length;

  if (!parsed.ok) {
    return (
      <Dialog title="That file couldn't be read" onCancel={onCancel}>
        <p className="dialog-body">{parsed.error} Nothing has been changed.</p>
        <div className="dialog-actions">
          <button type="button" className="button button--secondary" onClick={onCancel}>
            Close
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Replace everything with this file?" onCancel={onCancel}>
      <p className="dialog-body">
        The file holds {plural(parsed.notebooks, "notebook")} and {plural(parsed.pages, "page")}.
        Importing replaces what is here now
        {existing > 0 ? ` — all ${plural(existing, "item")} of it` : ""}, and that cannot be undone.
        Export first if you are not sure.
      </p>
      <div className="dialog-actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="button button--primary" onClick={onConfirm}>
          Replace
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({ title, children, onCancel }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="scrim" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Welcome({ hasNotebooks, onNew }) {
  return (
    <div className="canvas welcome">
      <h2 className="welcome-title">A quiet place to write.</h2>
      <p className="welcome-body">
        {hasNotebooks
          ? "Pick a notebook or a page on the left, or start a new one."
          : "Notebooks hold pages, pages hold sub-pages, as deep as you like. Start with a notebook."}
      </p>
      {!hasNotebooks && (
        <button type="button" className="button button--primary welcome-new" onClick={onNew}>
          <Plus size={18} aria-hidden="true" />
          New notebook
        </button>
      )}
    </div>
  );
}
