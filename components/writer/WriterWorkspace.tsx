"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  Eye,
  FilePlus2,
  Focus,
  GripVertical,
  ImagePlus,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import type { Chapter, DraftStory, StoryPage } from "@/lib/model";

type Props = {
  draft: DraftStory;
  setDraft: Dispatch<SetStateAction<DraftStory>>;
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function WriterWorkspace({ draft, setDraft, focusMode, setFocusMode }: Props) {
  const [saveStatus, setSaveStatus] = useState("Autosave on");
  const [notesOpen, setNotesOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chapterMenu, setChapterMenu] = useState<string | null>(null);
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeChapter = useMemo(
    () => draft.chapters.find((chapter) => chapter.id === draft.activeChapterId) ?? draft.chapters[0],
    [draft],
  );
  const activePageIndex = Math.max(0, activeChapter.pages.findIndex((page) => page.id === draft.activePageId));
  const activePage = activeChapter.pages[activePageIndex] ?? activeChapter.pages[0];
  const totalPages = draft.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0);
  const completeChapters = draft.chapters.filter((chapter) => chapter.pages.some((page) => page.body.trim() || page.image)).length;

  useEffect(() => {
    const timer = window.setTimeout(() => setSaveStatus("Saved just now"), 650);
    return () => window.clearTimeout(timer);
  }, [draft]);

  function updateChapter(chapterId: string, updater: (chapter: Chapter) => Chapter) {
    setDraft((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => chapter.id === chapterId ? updater(chapter) : chapter),
    }));
  }

  function updatePage(pageId: string, updater: (page: StoryPage) => StoryPage) {
    updateChapter(activeChapter.id, (chapter) => ({
      ...chapter,
      pages: chapter.pages.map((page) => page.id === pageId ? updater(page) : page),
    }));
  }

  function handleBodyChange(value: string) {
    const capacity = activePage.image ? 560 : 1120;
    if (value.length <= capacity) {
      updatePage(activePage.id, (page) => ({ ...page, body: value }));
      return;
    }

    let breakAt = value.lastIndexOf(" ", capacity);
    if (breakAt < capacity * 0.72) breakAt = capacity;
    const currentBody = value.slice(0, breakAt).trimEnd();
    const overflow = value.slice(breakAt).trimStart();
    const nextPage = activeChapter.pages[activePageIndex + 1];
    const newPageId = nextPage?.id ?? uid("page");

    updateChapter(activeChapter.id, (chapter) => {
      const pages = chapter.pages.map((page) => page.id === activePage.id ? { ...page, body: currentBody } : page);
      if (nextPage) {
        pages[activePageIndex + 1] = { ...nextPage, body: `${overflow}${nextPage.body ? ` ${nextPage.body}` : ""}` };
      } else {
        pages.push({ id: newPageId, body: overflow });
      }
      return { ...chapter, pages };
    });
    setDraft((current) => ({ ...current, activePageId: newPageId }));
  }

  function chooseChapter(chapter: Chapter) {
    setDraft((current) => ({ ...current, activeChapterId: chapter.id, activePageId: chapter.pages[0].id }));
    setChapterMenu(null);
  }

  function goToPage(index: number) {
    const page = activeChapter.pages[index];
    if (page) setDraft((current) => ({ ...current, activePageId: page.id }));
  }

  function startNextChapter() {
    const number = draft.chapters.length + 1;
    const pageId = uid("page");
    const chapter: Chapter = {
      id: uid("chapter"),
      title: `Chapter ${number}`,
      notes: "",
      pages: [{ id: pageId, body: "" }],
    };
    setDraft((current) => ({
      ...current,
      chapters: [...current.chapters, chapter],
      activeChapterId: chapter.id,
      activePageId: pageId,
    }));
  }

  function renameChapter(chapter: Chapter) {
    const next = window.prompt("Rename chapter", chapter.title);
    if (next?.trim()) updateChapter(chapter.id, (current) => ({ ...current, title: next.trim() }));
    setChapterMenu(null);
  }

  function deleteChapter(chapter: Chapter) {
    if (draft.chapters.length === 1) return;
    if (!window.confirm(`Delete “${chapter.title}”? This cannot be undone in the prototype.`)) return;
    setDraft((current) => {
      const chapters = current.chapters.filter((item) => item.id !== chapter.id);
      const nextActive = chapter.id === current.activeChapterId ? chapters[0] : chapters.find((item) => item.id === current.activeChapterId)!;
      return { ...current, chapters, activeChapterId: nextActive.id, activePageId: nextActive.pages[0].id };
    });
    setChapterMenu(null);
  }

  function reorderChapter(targetId: string) {
    if (!draggedChapter || draggedChapter === targetId) return;
    setDraft((current) => {
      const chapters = [...current.chapters];
      const from = chapters.findIndex((chapter) => chapter.id === draggedChapter);
      const to = chapters.findIndex((chapter) => chapter.id === targetId);
      const [moved] = chapters.splice(from, 1);
      chapters.splice(to, 0, moved);
      return { ...current, chapters };
    });
    setDraggedChapter(null);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      window.alert("For this local prototype, choose an image smaller than 2.5 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result);
      if (activePage.image || activePage.body.length > 560) {
        const pageId = uid("page");
        updateChapter(activeChapter.id, (chapter) => ({
          ...chapter,
          pages: [...chapter.pages.slice(0, activePageIndex + 1), { id: pageId, body: "", image, imageName: file.name }, ...chapter.pages.slice(activePageIndex + 1)],
        }));
        setDraft((current) => ({ ...current, activePageId: pageId }));
      } else {
        updatePage(activePage.id, (page) => ({ ...page, image, imageName: file.name }));
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleNotesKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = activeChapter.notes;
    if (event.shiftKey) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const removable = value.slice(lineStart, lineStart + 2) === "  ";
      if (!removable) return;
      const next = value.slice(0, lineStart) + value.slice(lineStart + 2);
      updateChapter(activeChapter.id, (chapter) => ({ ...chapter, notes: next }));
      requestAnimationFrame(() => input.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2)));
    } else {
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      updateChapter(activeChapter.id, (chapter) => ({ ...chapter, notes: next }));
      requestAnimationFrame(() => input.setSelectionRange(start + 2, start + 2));
    }
  }

  return (
    <div className="writer-view">
      <header className="writer-header">
        <div className="writer-title-block">
          <span className="eyebrow">MY STORIES / CURRENT DRAFT</span>
          <input
            className="story-title-input"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            aria-label="Story title"
          />
          <span className="story-meta">{draft.genre} · {draft.chapters.length} chapters · {totalPages} pages</span>
        </div>
        <div className="writer-actions">
          <div className="button-row">
            <button className="icon-button focus-toggle" onClick={() => setFocusMode((value) => !value)} title="Focus mode">
              {focusMode ? <Maximize2 size={18} /> : <Focus size={18} />}
            </button>
            <button className="secondary-button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Preview</button>
            <button className="primary-button" onClick={() => setPublishOpen(true)}><Upload size={17} /> Publish</button>
          </div>
          <span className={`save-status ${saveStatus === "Saving…" ? "saving" : ""}`}><Check size={14} /> {saveStatus}</span>
        </div>
      </header>

      <section className="writer-grid">
        <div className="manuscript-column">
          <div className="page-toolbar">
            <div className="page-pager">
              <button className="icon-button" disabled={activePageIndex === 0} onClick={() => goToPage(activePageIndex - 1)} aria-label="Previous page"><ArrowLeft size={17} /></button>
              <span>Page <strong>{activePageIndex + 1}</strong> of {activeChapter.pages.length}</span>
              <button className="icon-button" disabled={activePageIndex === activeChapter.pages.length - 1} onClick={() => goToPage(activePageIndex + 1)} aria-label="Next page"><ArrowRight size={17} /></button>
            </div>
            <span className="chapter-label">{activeChapter.title}</span>
          </div>

          <article
            className={`manuscript-page margin-${draft.style.margin} number-${draft.style.numberPosition}`}
            style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}
          >
            <div className="page-rule" />
            <textarea
              value={activePage.body}
              onChange={(event) => handleBodyChange(event.target.value)}
              placeholder="Start writing your chapter…"
              aria-label={`Page ${activePageIndex + 1} content`}
              spellCheck
            />
            {activePage.image && (
              <figure className="page-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activePage.image} alt={activePage.imageName || "Attached story illustration"} />
                <figcaption>{activePage.imageName}</figcaption>
                <button onClick={() => updatePage(activePage.id, (page) => ({ ...page, image: undefined, imageName: undefined }))} aria-label="Remove image"><X size={15} /></button>
              </figure>
            )}
            <span className="printed-page-number">{activePageIndex + 1}</span>
          </article>

          <div className="below-page-actions">
            <button className="secondary-button mobile-chapter-tools" onClick={() => setNotesOpen(true)}><NotebookPen size={17} /> Chapter notes</button>
            <button className="next-chapter-button" onClick={startNextChapter}>Start next chapter <ArrowRight size={18} /></button>
          </div>
          <p className="prototype-hint">When this page fills, writing flows onto a new page automatically.</p>
        </div>

        {!focusMode && (
          <aside className="structure-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">STORY STRUCTURE</span><strong>{completeChapters} of {draft.chapters.length} started</strong></div>
              <ChevronDown size={17} />
            </div>
            <div className="progress-track"><span style={{ width: `${Math.max(8, (completeChapters / draft.chapters.length) * 100)}%` }} /></div>

            <div className="chapter-list">
              {draft.chapters.map((chapter, index) => {
                const isActive = chapter.id === activeChapter.id;
                const isStarted = chapter.pages.some((page) => page.body.trim() || page.image);
                return (
                  <div
                    className={`chapter-row ${isActive ? "active" : ""}`}
                    key={chapter.id}
                    draggable
                    onDragStart={() => setDraggedChapter(chapter.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderChapter(chapter.id)}
                  >
                    <GripVertical className="drag-handle" size={17} />
                    <button className="chapter-main" onClick={() => chooseChapter(chapter)}>
                      <span className={`chapter-dot ${isStarted ? "started" : ""}`}>{isStarted ? <Check size={13} /> : index + 1}</span>
                      <span><strong>{chapter.title}</strong><small>{chapter.pages.length} {chapter.pages.length === 1 ? "page" : "pages"}</small></span>
                    </button>
                    <button className="more-button" onClick={() => setChapterMenu(chapterMenu === chapter.id ? null : chapter.id)} aria-label={`Options for ${chapter.title}`}><MoreHorizontal size={18} /></button>
                    {chapterMenu === chapter.id && (
                      <div className="chapter-menu">
                        <button onClick={() => renameChapter(chapter)}><Pencil size={14} /> Rename</button>
                        <button className="danger" disabled={draft.chapters.length === 1} onClick={() => deleteChapter(chapter)}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="add-chapter-link" onClick={startNextChapter}><Plus size={16} /> Add chapter</button>
            <div className="panel-divider" />
            <button className={`panel-action ${notesOpen ? "active" : ""}`} onClick={() => setNotesOpen((value) => !value)}><NotebookPen size={18} /><span><strong>Note</strong><small>Private chapter outline</small></span></button>
            <button className="panel-action" onClick={() => fileInput.current?.click()}><ImagePlus size={18} /><span><strong>Add Image</strong><small>Place it on this page</small></span></button>
            <input ref={fileInput} className="visually-hidden" type="file" accept="image/*" onChange={handleImage} />

            {notesOpen && (
              <div className="notes-panel">
                <div className="notes-heading"><span><LockKeyhole size={14} /> Only you can see this</span><button onClick={() => setNotesOpen(false)}><X size={15} /></button></div>
                <textarea
                  value={activeChapter.notes}
                  onChange={(event) => updateChapter(activeChapter.id, (chapter) => ({ ...chapter, notes: event.target.value }))}
                  onKeyDown={handleNotesKeyDown}
                  placeholder={"- Character detail\n  - Supporting thought"}
                  aria-label={`Private notes for ${activeChapter.title}`}
                />
                <small>Press Tab to indent · Shift + Tab to move back</small>
              </div>
            )}
          </aside>
        )}
      </section>

      {previewOpen && <StoryPreview draft={draft} onClose={() => setPreviewOpen(false)} />}
      {publishOpen && <PublishDialog draft={draft} setDraft={setDraft} onClose={() => setPublishOpen(false)} onPreview={() => { setPublishOpen(false); setPreviewOpen(true); }} />}
    </div>
  );
}

function StoryPreview({ draft, onClose }: { draft: DraftStory; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Story preview">
      <div className="reader-modal">
        <header><div><span className="eyebrow">READER PREVIEW</span><h2>{draft.title}</h2><p>{draft.genre} · by Maya Santos</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
        <div className="reader-pages" style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}>
          {draft.chapters.flatMap((chapter) => chapter.pages.map((page, index) => ({ ...page, chapter: chapter.title, index }))).map((page, globalIndex) => (
            <article className="reader-page" key={page.id}>
              {page.index === 0 && <><span className="reader-chapter-kicker">CHAPTER</span><h3>{page.chapter}</h3></>}
              <p>{page.body || "This page is waiting to be written."}</p>
              {page.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.image} alt="Story illustration" />
                </>
              )}
              <span>{globalIndex + 1}</span>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function PublishDialog({ draft, setDraft, onClose, onPreview }: { draft: DraftStory; setDraft: Dispatch<SetStateAction<DraftStory>>; onClose: () => void; onPreview: () => void }) {
  const genres = ["Romance", "Action", "Fantasy", "Mystery", "Supernatural", "Science Fiction", "Literary", "Young Adult"];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Publish story">
      <div className="publish-dialog">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <span className="publish-icon"><BookOpenCheck size={23} /></span>
        <span className="eyebrow">READY FOR READERS?</span>
        <h2>Publish your story</h2>
        <p>Review the details readers will use to discover your book.</p>
        <label>Book title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <label>Genre<select value={draft.genre} onChange={(event) => setDraft((current) => ({ ...current, genre: event.target.value }))}>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
        <label>Short description<textarea value={draft.synopsis} onChange={(event) => setDraft((current) => ({ ...current, synopsis: event.target.value }))} /></label>
        <div className="publish-summary"><FilePlus2 size={18} /><span><strong>{draft.chapters.length} chapters</strong><small>{draft.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0)} formatted pages</small></span></div>
        <div className="dialog-actions"><button className="secondary-button" onClick={onPreview}><Eye size={16} /> Preview</button><button className="primary-button" onClick={() => { window.alert("Published in prototype mode — your story still lives only on this device."); onClose(); }}><Upload size={16} /> Publish story</button></div>
      </div>
    </div>
  );
}
