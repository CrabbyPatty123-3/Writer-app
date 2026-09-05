"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  Crop,
  Eye,
  FilePlus2,
  Focus,
  GripVertical,
  ImagePlus,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  Move,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, Dispatch, DragEvent, FormEvent, KeyboardEvent, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { useModalKeyboard } from "@/components/useModalKeyboard";
import GenrePicker from "./GenrePicker";
import type { Chapter, ChapterNote, DraftStory, StoryPage } from "@/lib/model";

type Props = {
  draft: DraftStory;
  setDraft: Dispatch<SetStateAction<DraftStory>>;
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  onEditBook: () => void;
  onDeleteBook: () => void;
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type MeasureStyle = { width: number; height: number; font: string; lineHeight: string; letterSpacing: string };

function splitTextToFit(text: string, style: MeasureStyle) {
  if (!text) return { pageText: "", overflow: "" };
  const measurer = document.createElement("textarea");
  Object.assign(measurer.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${style.width}px`,
    height: `${Math.max(80, style.height)}px`,
    padding: "0",
    border: "0",
    overflow: "hidden",
    resize: "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    font: style.font,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  });
  document.body.appendChild(measurer);

  const fits = (candidate: string) => {
    measurer.value = candidate;
    return measurer.scrollHeight <= measurer.clientHeight + 1;
  };

  if (fits(text)) {
    measurer.remove();
    return { pageText: text, overflow: "" };
  }

  let low = 1;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(text.slice(0, middle))) low = middle;
    else high = middle - 1;
  }

  let breakAt = Math.max(1, low);
  const wordBreak = Math.max(text.lastIndexOf(" ", breakAt), text.lastIndexOf("\n", breakAt));
  if (wordBreak > breakAt * 0.72) breakAt = wordBreak;
  const pageText = text.slice(0, breakAt).trimEnd();
  const overflow = text.slice(breakAt).trimStart();
  measurer.remove();
  return { pageText, overflow };
}

export default function WriterWorkspace({ draft, setDraft, focusMode, setFocusMode, onEditBook, onDeleteBook }: Props) {
  const [saveStatus, setSaveStatus] = useState("Autosave on");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chapterMenu, setChapterMenu] = useState<string | null>(null);
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);
  const [renameChapterId, setRenameChapterId] = useState<string | null>(null);
  const [deleteChapterId, setDeleteChapterId] = useState<string | null>(null);
  const [imageEditPageId, setImageEditPageId] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chapterTitleRef = useRef<HTMLDivElement>(null);

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
    const pageElement = pageRef.current;
    const input = textareaRef.current;
    if (!pageElement || !input) {
      updatePage(activePage.id, (page) => ({ ...page, body: value }));
      return;
    }

    const pageStyle = window.getComputedStyle(pageElement);
    const inputStyle = window.getComputedStyle(input);
    const contentHeight = pageElement.clientHeight - parseFloat(pageStyle.paddingTop) - parseFloat(pageStyle.paddingBottom);
    const baseMeasure = {
      width: input.clientWidth,
      height: contentHeight,
      font: inputStyle.font,
      lineHeight: inputStyle.lineHeight,
      letterSpacing: inputStyle.letterSpacing,
    };
    const futureText = activeChapter.pages.slice(activePageIndex + 1).map((page) => page.body).filter(Boolean);
    let remaining = [value, ...futureText].filter(Boolean).join("\n\n");
    const templates = activeChapter.pages.slice(activePageIndex);
    const reflowed: StoryPage[] = [];
    let templateIndex = 0;

    while (remaining && reflowed.length < 200) {
      const template = templates[templateIndex] ?? { id: uid("page"), body: "" };
      const imageSpace = template.image ? Math.min(310, pageElement.clientWidth * 0.48) : 0;
      const isFirstChapterPage = activePageIndex + templateIndex === 0;
      const titleSpace = isFirstChapterPage ? (chapterTitleRef.current?.offsetHeight ?? 95) + 34 : 0;
      const { pageText, overflow } = splitTextToFit(remaining, { ...baseMeasure, height: contentHeight - imageSpace - titleSpace });
      reflowed.push({ ...template, body: pageText });
      remaining = overflow;
      templateIndex += 1;
    }

    for (const template of templates.slice(templateIndex)) {
      if (template.image) reflowed.push({ ...template, body: "" });
    }
    if (!reflowed.length) reflowed.push({ ...templates[0], body: "" });

    const shouldAdvance = Boolean(remaining === "" && reflowed.length > 1 && value.length >= activePage.body.length && reflowed[0].body !== value);
    const nextActivePage = shouldAdvance ? reflowed[reflowed.length - 1] : reflowed[0];
    setDraft((current) => ({
      ...current,
      activePageId: nextActivePage.id,
      chapters: current.chapters.map((chapter) => chapter.id === activeChapter.id
        ? { ...chapter, pages: [...chapter.pages.slice(0, activePageIndex), ...reflowed] }
        : chapter),
    }));
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
    const activeIndex = draft.chapters.findIndex((chapter) => chapter.id === activeChapter.id);
    const plannedNextChapter = draft.chapters[activeIndex + 1];
    if (plannedNextChapter) {
      chooseChapter(plannedNextChapter);
      return;
    }
    addChapter();
  }

  function addChapter() {
    const number = draft.chapters.length + 1;
    const pageId = uid("page");
    const chapter: Chapter = {
      id: uid("chapter"),
      title: `Chapter ${number}`,
      notes: [],
      pages: [{ id: pageId, body: "" }],
    };
    setDraft((current) => ({
      ...current,
      chapters: [...current.chapters, chapter],
      activeChapterId: chapter.id,
      activePageId: pageId,
    }));
  }

  function renameChapter(chapterId: string, title: string) {
    if (title.trim()) updateChapter(chapterId, (current) => ({ ...current, title: title.trim() }));
    setRenameChapterId(null);
    setChapterMenu(null);
  }

  function deleteChapter(chapter: Chapter) {
    if (draft.chapters.length === 1) return;
    setDraft((current) => {
      const chapters = current.chapters.filter((item) => item.id !== chapter.id);
      const nextActive = chapter.id === current.activeChapterId ? chapters[0] : chapters.find((item) => item.id === current.activeChapterId)!;
      return { ...current, chapters, activeChapterId: nextActive.id, activePageId: nextActive.pages[0].id };
    });
    setDeleteChapterId(null);
    setChapterMenu(null);
  }

  function reorderChapter(targetId: string, sourceId = draggedChapter) {
    if (!sourceId || sourceId === targetId) return;
    setDraft((current) => {
      const chapters = [...current.chapters];
      const from = chapters.findIndex((chapter) => chapter.id === sourceId);
      const to = chapters.findIndex((chapter) => chapter.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = chapters.splice(from, 1);
      chapters.splice(to, 0, moved);
      return { ...current, chapters };
    });
    setDraggedChapter(null);
  }

  function handleChapterDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    reorderChapter(targetId, event.dataTransfer.getData("text/plain") || draggedChapter);
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
          pages: [...chapter.pages.slice(0, activePageIndex + 1), { id: pageId, body: "", image, imageName: file.name, imageFit: "contain", imagePositionX: 50, imagePositionY: 50 }, ...chapter.pages.slice(activePageIndex + 1)],
        }));
        setDraft((current) => ({ ...current, activePageId: pageId }));
      } else {
        updatePage(activePage.id, (page) => ({ ...page, image, imageName: file.name, imageFit: "contain", imagePositionX: 50, imagePositionY: 50 }));
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function addNote(chapterId: string) {
    const note = { id: uid("note"), body: "" };
    updateChapter(chapterId, (chapter) => ({ ...chapter, notes: [...chapter.notes, note] }));
    setOpenNoteId(note.id);
  }

  function updateNote(chapterId: string, noteId: string, body: string) {
    updateChapter(chapterId, (chapter) => ({
      ...chapter,
      notes: chapter.notes.map((note) => note.id === noteId ? { ...note, body } : note),
    }));
  }

  function deleteNote(chapterId: string, noteId: string) {
    updateChapter(chapterId, (chapter) => ({ ...chapter, notes: chapter.notes.filter((note) => note.id !== noteId) }));
    if (openNoteId === noteId) setOpenNoteId(null);
  }

  function handleNotesKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, chapterId: string, note: ChapterNote) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = note.body;
    const blockStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = value.indexOf("\n", end);
    const blockEnd = nextNewline === -1 ? value.length : nextNewline;
    const lines = value.slice(blockStart, blockEnd).split("\n");
    const transformed = lines.map((line) => event.shiftKey ? line.replace(/^ {1,2}/, "") : `  ${line}`);
    const nextBlock = transformed.join("\n");
    const next = value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);
    const firstDelta = transformed[0].length - lines[0].length;
    const totalDelta = nextBlock.length - (blockEnd - blockStart);
    updateNote(chapterId, note.id, next);
    requestAnimationFrame(() => input.setSelectionRange(Math.max(blockStart, start + firstDelta), Math.max(blockStart, end + totalDelta)));
  }

  function handlePageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab" && event.key !== "Enter") return;
    const input = event.currentTarget;
    const value = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (event.key === "Enter") {
      event.preventDefault();
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const indent = value.slice(lineStart, start).match(/^ */)?.[0] ?? "";
      const insertion = `\n${indent}`;
      handleBodyChange(value.slice(0, start) + insertion + value.slice(end));
      requestAnimationFrame(() => textareaRef.current?.setSelectionRange(start + insertion.length, start + insertion.length));
      return;
    }

    event.preventDefault();
    if (start === end) {
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const removable = value.slice(lineStart, start).match(/^ {1,4}/)?.[0].length ?? 0;
        handleBodyChange(value.slice(0, lineStart) + value.slice(lineStart + removable));
        requestAnimationFrame(() => textareaRef.current?.setSelectionRange(Math.max(lineStart, start - removable), Math.max(lineStart, start - removable)));
      } else {
        const indentation = "    ";
        handleBodyChange(value.slice(0, start) + indentation + value.slice(end));
        requestAnimationFrame(() => textareaRef.current?.setSelectionRange(start + indentation.length, start + indentation.length));
      }
      return;
    }

    const blockStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = value.indexOf("\n", end);
    const blockEnd = nextNewline === -1 ? value.length : nextNewline;
    const lines = value.slice(blockStart, blockEnd).split("\n");
    const transformed = lines.map((line) => event.shiftKey ? line.replace(/^ {1,4}/, "") : `    ${line}`);
    const replacement = transformed.join("\n");
    handleBodyChange(value.slice(0, blockStart) + replacement + value.slice(blockEnd));
    requestAnimationFrame(() => textareaRef.current?.setSelectionRange(blockStart, blockStart + replacement.length));
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
          <span className="story-meta">{draft.genres.join(" · ")} · {draft.chapters.length} chapters · {totalPages} pages</span>
        </div>
        <div className="writer-actions">
          <div className="button-row">
            <button className="icon-button focus-toggle" onClick={() => setFocusMode((value) => !value)} aria-label={focusMode ? "Exit enlarged writing canvas" : "Enlarge writing canvas"} title={focusMode ? "Exit enlarged canvas" : "Enlarge writing canvas"}>
              {focusMode ? <Maximize2 size={18} /> : <Focus size={18} />}
            </button>
            <button className="secondary-button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Preview</button>
            <button className="primary-button" onClick={() => setPublishOpen(true)}><Upload size={17} /> Publish</button>
          </div>
          <span className={`save-status ${saveStatus === "Saving…" ? "saving" : ""}`} role="status" aria-live="polite"><Check size={14} /> {publishMessage || saveStatus}</span>
        </div>
      </header>

      <section className="writer-grid">
        <div className="manuscript-column">
          <div className="page-toolbar">
            <div className="page-pager">
              <button className="icon-button" disabled={activePageIndex === 0} onClick={() => goToPage(activePageIndex - 1)} aria-label="Previous page"><ArrowLeft size={17} /></button>
              <button className="page-count-button" onClick={() => setPagePickerOpen(true)} aria-label="Open page overview">Page <strong>{activePageIndex + 1}</strong> of {activeChapter.pages.length}</button>
              <button className="icon-button" disabled={activePageIndex === activeChapter.pages.length - 1} onClick={() => goToPage(activePageIndex + 1)} aria-label="Next page"><ArrowRight size={17} /></button>
            </div>
            <span className="chapter-label">{activeChapter.title}</span>
          </div>

          <article
            ref={pageRef}
            className={`manuscript-page margin-${draft.style.margin} number-${draft.style.numberPosition}`}
            style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}
          >
            <div className="page-rule" />
            {activePageIndex === 0 && (
              <div className="chapter-page-heading" ref={chapterTitleRef}>
                <span>Chapter {draft.chapters.findIndex((chapter) => chapter.id === activeChapter.id) + 1}</span>
                <input
                  value={activeChapter.title}
                  onChange={(event) => updateChapter(activeChapter.id, (chapter) => ({ ...chapter, title: event.target.value }))}
                  placeholder="Name this chapter"
                  aria-label="Chapter title"
                />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={activePage.body}
              onChange={(event) => handleBodyChange(event.target.value)}
              onKeyDown={handlePageKeyDown}
              placeholder={activePageIndex === 0 ? "Begin your chapter…" : "Continue writing…"}
              aria-label={`Page ${activePageIndex + 1} content`}
              spellCheck
            />
            {activePage.image && (
              <figure
                className={`page-image image-${activePage.imageFit ?? "contain"}`}
                style={{ "--image-x": `${activePage.imagePositionX ?? 50}%`, "--image-y": `${activePage.imagePositionY ?? 50}%` } as React.CSSProperties}
                onClick={() => setImageEditPageId(activePage.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setImageEditPageId(activePage.id); }}
                role="button"
                tabIndex={0}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activePage.image} alt={activePage.imageName || "Attached story illustration"} />
                <figcaption>{activePage.imageName}</figcaption>
                <button type="button" onClick={() => setImageEditPageId(activePage.id)} aria-label="Open image options"><Crop size={15} /><span>Image options</span></button>
              </figure>
            )}
            <span className="printed-page-number">{activePageIndex + 1}</span>
          </article>

          <div className="below-page-actions">
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
                  <div className="chapter-tree-item" key={chapter.id}>
                    <div
                      className={`chapter-row ${isActive ? "active" : ""}`}
                      draggable
                      onDragStart={(event) => { setDraggedChapter(chapter.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", chapter.id); }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleChapterDrop(event, chapter.id)}
                      onDragEnd={() => setDraggedChapter(null)}
                    >
                      <GripVertical className="drag-handle" size={17} />
                      <button className="chapter-main" onClick={() => chooseChapter(chapter)}>
                        <span className={`chapter-dot ${isStarted ? "started" : ""}`}>{isStarted ? <Check size={13} /> : index + 1}</span>
                        <span><strong>{chapter.title}</strong><small>{chapter.pages.length} {chapter.pages.length === 1 ? "page" : "pages"}</small></span>
                      </button>
                      <div className="chapter-row-actions">
                        <button className={`chapter-note-button ${chapter.notes.length ? "has-note" : ""}`} onClick={() => addNote(chapter.id)} aria-label={`Add a private note to ${chapter.title}`}><Plus size={16} /></button>
                        <button className="more-button" onClick={() => setChapterMenu(chapterMenu === chapter.id ? null : chapter.id)} aria-label={`Options for ${chapter.title}`} aria-expanded={chapterMenu === chapter.id}><MoreHorizontal size={18} /></button>
                      </div>
                      {chapterMenu === chapter.id && (
                        <div className="chapter-menu">
                          <button onClick={() => { setRenameChapterId(chapter.id); setChapterMenu(null); }}><Pencil size={14} /> Rename</button>
                          <button className="danger" disabled={draft.chapters.length === 1} onClick={() => { setDeleteChapterId(chapter.id); setChapterMenu(null); }}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                    {chapter.notes.map((note) => {
                      const isOpen = openNoteId === note.id;
                      return (
                        <div className={`chapter-note-branch ${isOpen ? "open" : "collapsed"}`} key={note.id}>
                          <span className="note-branch-line" aria-hidden="true" />
                          {isOpen ? (
                            <div
                              className="chapter-note-card"
                              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenNoteId(null); }}
                            >
                              <div className="chapter-note-heading">
                                <span><LockKeyhole size={13} /> Private note</span>
                                <button onClick={() => deleteNote(chapter.id, note.id)} aria-label={`Delete note from ${chapter.title}`}><Trash2 size={14} /></button>
                              </div>
                              <textarea
                                autoFocus
                                value={note.body}
                                onChange={(event) => updateNote(chapter.id, note.id, event.target.value)}
                                onKeyDown={(event) => handleNotesKeyDown(event, chapter.id, note)}
                                placeholder="Add a reminder, plot detail, or nested outline…"
                                aria-label={`Private note for ${chapter.title}`}
                              />
                              <small>Tab indents · only you can see this</small>
                            </div>
                          ) : (
                            <div className="chapter-note-summary">
                              <button className="chapter-note-summary-open" onClick={() => setOpenNoteId(note.id)}>
                                <LockKeyhole size={13} />
                                <span>{note.body.trim().split("\n")[0] || "Empty private note"}</span>
                                <small>Open</small>
                              </button>
                              <button className="chapter-note-summary-delete" onClick={() => deleteNote(chapter.id, note.id)} aria-label={`Delete note from ${chapter.title}`}><Trash2 size={13} /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <button className="add-chapter-link" onClick={addChapter}><Plus size={16} /> Add chapter</button>
            <div className="panel-divider" />
            <button className="panel-action" onClick={() => fileInput.current?.click()}><ImagePlus size={18} /><span><strong>Add Image</strong><small>Place it on this page</small></span></button>
            <button className="panel-action" onClick={onEditBook}><Pencil size={18} /><span><strong>Edit Book</strong><small>Cover, genres, and details</small></span></button>
            <button className="panel-action danger" onClick={onDeleteBook}><Trash2 size={18} /><span><strong>Delete Book</strong><small>Remove this book</small></span></button>
            <input ref={fileInput} className="visually-hidden" type="file" accept="image/*" onChange={handleImage} />
          </aside>
        )}
      </section>

      {previewOpen && <StoryPreview draft={draft} onClose={() => setPreviewOpen(false)} />}
      {publishOpen && <PublishDialog draft={draft} setDraft={setDraft} onClose={() => setPublishOpen(false)} onPublished={() => { setPublishOpen(false); setPublishMessage("Published locally"); }} onPreview={() => { setPublishOpen(false); setPreviewOpen(true); }} />}
      {renameChapterId && <RenameChapterDialog chapter={draft.chapters.find((chapter) => chapter.id === renameChapterId)!} onClose={() => setRenameChapterId(null)} onRename={renameChapter} />}
      {deleteChapterId && <DeleteChapterDialog chapter={draft.chapters.find((chapter) => chapter.id === deleteChapterId)!} onClose={() => setDeleteChapterId(null)} onDelete={deleteChapter} />}
      {imageEditPageId && <ImageEditorDialog page={activeChapter.pages.find((page) => page.id === imageEditPageId)} onClose={() => setImageEditPageId(null)} onUpdate={(updater) => updatePage(imageEditPageId, updater)} />}
      {pagePickerOpen && <PagePickerDialog chapter={activeChapter} activePageId={activePage.id} onClose={() => setPagePickerOpen(false)} onSelect={(index) => { goToPage(index); setPagePickerOpen(false); }} />}
    </div>
  );
}

function PagePickerDialog({ chapter, activePageId, onClose, onSelect }: { chapter: Chapter; activePageId: string; onClose: () => void; onSelect: (index: number) => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="page-picker-title">
      <div className="page-picker-dialog" ref={panelRef}>
        <header>
          <div><span className="eyebrow">PAGE OVERVIEW</span><h2 id="page-picker-title">{chapter.title}</h2><p>Select a page to continue writing there.</p></div>
          <button className="modal-close" onClick={onClose} aria-label="Close page overview"><X size={19} /></button>
        </header>
        <div className="page-picker-grid">
          {chapter.pages.map((page, index) => (
            <button className={page.id === activePageId ? "active" : ""} key={page.id} onClick={() => onSelect(index)} aria-label={`Go to page ${index + 1}`}>
              <span className="page-thumbnail">
                {index === 0 && <strong>{chapter.title}</strong>}
                <i>{page.body || "Blank page"}</i>
                {page.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.image} alt="" />
                )}
                <small>{index + 1}</small>
              </span>
              <span>Page {index + 1}{page.id === activePageId && <em>Current</em>}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryPreview({ draft, onClose }: { draft: DraftStory; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="story-preview-title">
      <div className="reader-modal" ref={panelRef}>
        <header><div><span className="eyebrow">READER PREVIEW</span><h2 id="story-preview-title">{draft.title}</h2><p>{draft.genres.join(" · ")} · by Maya Santos</p></div><button className="icon-button" onClick={onClose} aria-label="Close story preview"><X size={19} /></button></header>
        <div className="reader-pages" style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}>
          {draft.chapters.flatMap((chapter) => chapter.pages.map((page, index) => ({ ...page, chapter: chapter.title, index }))).map((page, globalIndex) => (
            <article className="reader-page" key={page.id}>
              {page.index === 0 && <><span className="reader-chapter-kicker">CHAPTER</span><h3>{page.chapter}</h3></>}
              <p>{page.body || "This page is waiting to be written."}</p>
              {page.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={`reader-page-image image-${page.imageFit ?? "contain"}`}
                  style={{ objectPosition: `${page.imagePositionX ?? 50}% ${page.imagePositionY ?? 50}%` }}
                  src={page.image}
                  alt="Story illustration"
                />
              )}
              <span>{globalIndex + 1}</span>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageEditorDialog({ page, onClose, onUpdate }: { page?: StoryPage; onClose: () => void; onUpdate: (updater: (page: StoryPage) => StoryPage) => void }) {
  const [fit, setFit] = useState<NonNullable<StoryPage["imageFit"]>>(page?.imageFit ?? "contain");
  const [positionX, setPositionX] = useState(page?.imagePositionX ?? 50);
  const [positionY, setPositionY] = useState(page?.imagePositionY ?? 50);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(null);
  useModalKeyboard(panelRef, onClose);
  if (!page?.image) return null;

  function clamp(value: number) {
    return Math.max(0, Math.min(100, value));
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || fit === "contain") return;
    setPositionX(clamp(drag.positionX + (event.clientX - drag.x) * 0.35));
    setPositionY(clamp(drag.positionY + (event.clientY - drag.y) * 0.35));
  }

  function save() {
    onUpdate((current) => ({ ...current, imageFit: fit, imagePositionX: positionX, imagePositionY: positionY }));
    onClose();
  }

  function remove() {
    onUpdate((current) => ({ ...current, image: undefined, imageName: undefined, imageFit: undefined, imagePositionX: undefined, imagePositionY: undefined }));
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
      <div className="image-editor-dialog" ref={panelRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close image options"><X size={19} /></button>
        <span className="eyebrow">PAGE IMAGE</span>
        <h2 id="image-editor-title">Position your image</h2>
        <p>Choose how the image sits on the page. In cropped modes, drag the preview to move its focal point.</p>
        <div
          className={`image-crop-preview image-${fit}`}
          style={{ "--image-x": `${positionX}%`, "--image-y": `${positionY}%` } as React.CSSProperties}
          onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY, positionX, positionY }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragRef.current = null; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="Image positioning preview" draggable={false} />
          {fit !== "contain" && <span><Move size={15} /> Drag to reposition</span>}
        </div>
        <div className="image-fit-options" role="group" aria-label="Image layout">
          <button className={fit === "contain" ? "active" : ""} onClick={() => setFit("contain")}><ImagePlus size={17} /><span><strong>Fit</strong><small>Inside margins</small></span></button>
          <button className={fit === "crop" ? "active" : ""} onClick={() => setFit("crop")}><Crop size={17} /><span><strong>Crop</strong><small>Fill a frame</small></span></button>
          <button className={fit === "fullscreen" ? "active" : ""} onClick={() => setFit("fullscreen")}><Maximize2 size={17} /><span><strong>Full page</strong><small>Ignore margins</small></span></button>
        </div>
        {fit !== "contain" && (
          <div className="image-position-controls">
            <label>Horizontal position<input type="range" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} /></label>
            <label>Vertical position<input type="range" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} /></label>
          </div>
        )}
        <div className="dialog-actions image-dialog-actions"><button className="danger-text-button" onClick={remove}><Trash2 size={15} /> Remove image</button><span /><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}>Apply</button></div>
      </div>
    </div>
  );
}

function PublishDialog({ draft, setDraft, onClose, onPreview, onPublished }: { draft: DraftStory; setDraft: Dispatch<SetStateAction<DraftStory>>; onClose: () => void; onPreview: () => void; onPublished: () => void }) {
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLFormElement>(null);
  useModalKeyboard(panelRef, onClose);

  function publish(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const synopsis = String(formData.get("synopsis") ?? "").trim();
    if (!title) {
      setError("Add a book title before publishing.");
      return;
    }
    if (!synopsis) {
      setError("Add a short description so readers know what the book is about.");
      return;
    }
    if (!draft.genres.length) {
      setError("Choose at least one genre, or type your own.");
      return;
    }
    if (!draft.chapters.some((chapter) => chapter.pages.some((page) => page.body.trim() || page.image))) {
      setError("Write at least one page before publishing.");
      return;
    }
    setDraft((current) => ({ ...current, title, synopsis, status: "published" }));
    onPublished();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="publish-story-title">
      <form className="publish-dialog" onSubmit={publish} ref={panelRef}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close publish dialog"><X size={19} /></button>
        <span className="publish-icon"><BookOpenCheck size={23} /></span>
        <span className="eyebrow">READY FOR READERS?</span>
        <h2 id="publish-story-title">Publish your story</h2>
        <p>Review the details readers will use to discover your book.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>Book title<input name="title" value={draft.title} onChange={(event) => { setDraft((current) => ({ ...current, title: event.target.value })); setError(""); }} /></label>
        <GenrePicker value={draft.genres} onChange={(genres) => { setDraft((current) => ({ ...current, genres })); setError(""); }} />
        <label>Short description<textarea name="synopsis" value={draft.synopsis} onChange={(event) => { setDraft((current) => ({ ...current, synopsis: event.target.value })); setError(""); }} /></label>
        <div className="publish-summary"><FilePlus2 size={18} /><span><strong>{draft.chapters.length} chapters</strong><small>{draft.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0)} formatted pages</small></span></div>
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onPreview}><Eye size={16} /> Preview</button><button className="primary-button" type="submit"><Upload size={16} /> Publish story</button></div>
      </form>
    </div>
  );
}

function RenameChapterDialog({ chapter, onClose, onRename }: { chapter: Chapter; onClose: () => void; onRename: (chapterId: string, title: string) => void }) {
  const [title, setTitle] = useState(chapter.title);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLFormElement>(null);
  useModalKeyboard(panelRef, onClose);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("A chapter needs a name.");
      return;
    }
    onRename(chapter.id, title);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rename-chapter-title">
      <form className="confirm-dialog" onSubmit={submit} ref={panelRef}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close rename dialog"><X size={19} /></button>
        <span className="confirm-icon"><Pencil size={20} /></span>
        <h2 id="rename-chapter-title">Rename chapter</h2>
        <p>Choose a title that helps you find this part of the story.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>Chapter title<input autoFocus value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} /></label>
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Save title</button></div>
      </form>
    </div>
  );
}

function DeleteChapterDialog({ chapter, onClose, onDelete }: { chapter: Chapter; onClose: () => void; onDelete: (chapter: Chapter) => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-chapter-title" aria-describedby="delete-chapter-description">
      <div className="confirm-dialog" ref={panelRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close delete dialog"><X size={19} /></button>
        <span className="confirm-icon danger"><Trash2 size={20} /></span>
        <h2 id="delete-chapter-title">Delete “{chapter.title}”?</h2>
        <p id="delete-chapter-description">Its pages, images, and private notes will be removed from this local prototype.</p>
        <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Keep chapter</button><button className="danger-button" onClick={() => onDelete(chapter)}>Delete chapter</button></div>
      </div>
    </div>
  );
}
