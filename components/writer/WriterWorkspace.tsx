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
  Lock,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, Dispatch, DragEvent, FormEvent, KeyboardEvent, SetStateAction, useMemo, useRef, useState } from "react";
import { useModalKeyboard } from "@/components/useModalKeyboard";
import GenrePicker from "./GenrePicker";
import type { Chapter, ChapterNote, DraftStory, StoryPage } from "@/lib/model";

type Props = {
  draft: DraftStory;
  setDraft: Dispatch<SetStateAction<DraftStory>>;
  saveStatus: string;
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

export default function WriterWorkspace({ draft, setDraft, saveStatus, focusMode, setFocusMode, onEditBook, onDeleteBook }: Props) {
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chapterMenu, setChapterMenu] = useState<string | null>(null);
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);
  const [renameChapterId, setRenameChapterId] = useState<string | null>(null);
  const [deleteChapterId, setDeleteChapterId] = useState<string | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<{ chapterId: string; noteId: string } | null>(null);
  const [selectedImagePageId, setSelectedImagePageId] = useState<string | null>(null);
  const [draggingImage, setDraggingImage] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chapterTitleRef = useRef<HTMLDivElement>(null);
  const imageDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  const activeChapter = useMemo(
    () => draft.chapters.find((chapter) => chapter.id === draft.activeChapterId) ?? draft.chapters[0],
    [draft],
  );
  const activePageIndex = Math.max(0, activeChapter.pages.findIndex((page) => page.id === draft.activePageId));
  const activePage = activeChapter.pages[activePageIndex] ?? activeChapter.pages[0];
  const activeChapterIndex = Math.max(0, draft.chapters.findIndex((chapter) => chapter.id === activeChapter.id));
  const activeBookPageNumber = draft.chapters
    .slice(0, activeChapterIndex)
    .reduce((sum, chapter) => sum + chapter.pages.length, 0) + activePageIndex + 1;
  const totalPages = draft.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0);
  const completeChapters = draft.chapters.filter((chapter) => chapter.pages.some((page) => page.body.trim() || page.image)).length;

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
    if (activePageIndex > 0 && value === "" && !activePage.image) {
      const previousPage = activeChapter.pages[activePageIndex - 1];
      setDraft((current) => ({
        ...current,
        activePageId: previousPage.id,
        chapters: current.chapters.map((chapter) => chapter.id === activeChapter.id
          ? { ...chapter, pages: chapter.pages.filter((page) => page.id !== activePage.id) }
          : chapter),
      }));
      setSelectedImagePageId(null);
      return;
    }

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
    setOpenNoteId(null);
    setChapterMenu(null);
  }

  function goToPage(index: number) {
    const page = activeChapter.pages[index];
    if (page) {
      setDraft((current) => ({ ...current, activePageId: page.id }));
      setSelectedImagePageId(null);
    }
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
    const pageId = uid("page");
    const chapter: Chapter = {
      id: uid("chapter"),
      title: "",
      notes: [],
      pages: [{ id: pageId, body: "" }],
    };
    setDraft((current) => ({
      ...current,
      chapters: [...current.chapters, chapter],
      activeChapterId: chapter.id,
      activePageId: pageId,
    }));
    setOpenNoteId(null);
    setSelectedImagePageId(null);
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
    setOpenNoteId(null);
    setSelectedImagePageId(null);
    setDraggingImage(false);
    imageDragRef.current = null;
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
          pages: [...chapter.pages.slice(0, activePageIndex + 1), { id: pageId, body: "", image, imageName: file.name, imageFit: "contain", imagePositionX: 50, imagePositionY: 50, imagePlacementX: 50, imagePlacementY: 72, imageLocked: false }, ...chapter.pages.slice(activePageIndex + 1)],
        }));
        setDraft((current) => ({ ...current, activePageId: pageId }));
        setSelectedImagePageId(pageId);
      } else {
        updatePage(activePage.id, (page) => ({ ...page, image, imageName: file.name, imageFit: "contain", imagePositionX: 50, imagePositionY: 50, imagePlacementX: 50, imagePlacementY: 72, imageLocked: false }));
        setSelectedImagePageId(activePage.id);
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
    setDeleteNoteTarget(null);
  }

  function handleWorkspaceClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const noteBranch = target.closest("[data-note-id]") as HTMLElement | null;
    const isDeleteNoteButton = Boolean(target.closest("[data-delete-note]"));

    if (noteBranch) {
      if (!isDeleteNoteButton) {
        const nextNoteId = noteBranch.dataset.noteId;
        if (nextNoteId && nextNoteId !== openNoteId) setOpenNoteId(nextNoteId);
      }
    } else if (!target.closest(".chapter-note-button") && !target.closest(".modal-backdrop")) {
      setOpenNoteId(null);
    }

    if (!target.closest(".page-image")) setSelectedImagePageId(null);
  }

  function handleImagePointerDown(event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
    setSelectedImagePageId(activePage.id);
    if (activePage.imageLocked || activePage.imageFit === "fullscreen" || (event.target as HTMLElement).closest(".page-image-controls")) return;

    const figureRect = event.currentTarget.getBoundingClientRect();
    imageDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - (figureRect.left + figureRect.width / 2),
      offsetY: event.clientY - (figureRect.top + figureRect.height / 2),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingImage(true);
  }

  function handleImagePointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = imageDragRef.current;
    const page = pageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !page) return;

    const pageRect = page.getBoundingClientRect();
    const figureRect = event.currentTarget.getBoundingClientRect();
    const boundary = Math.min(28, pageRect.width * 0.055);
    const halfWidth = figureRect.width / 2;
    const halfHeight = figureRect.height / 2;
    const minX = boundary + halfWidth;
    const maxX = Math.max(minX, pageRect.width - boundary - halfWidth);
    const minY = boundary + halfHeight;
    const maxY = Math.max(minY, pageRect.height - boundary - halfHeight);
    const centerX = Math.max(minX, Math.min(maxX, event.clientX - pageRect.left - drag.offsetX));
    const centerY = Math.max(minY, Math.min(maxY, event.clientY - pageRect.top - drag.offsetY));

    updatePage(activePage.id, (current) => ({
      ...current,
      imagePlacementX: (centerX / pageRect.width) * 100,
      imagePlacementY: (centerY / pageRect.height) * 100,
    }));
  }

  function finishImageDrag(event: React.PointerEvent<HTMLElement>) {
    if (imageDragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    imageDragRef.current = null;
    setDraggingImage(false);
  }

  function toggleImageFullPage() {
    updatePage(activePage.id, (page) => ({ ...page, imageFit: page.imageFit === "fullscreen" ? "contain" : "fullscreen" }));
  }

  function toggleImageLock() {
    updatePage(activePage.id, (page) => ({ ...page, imageLocked: !page.imageLocked }));
  }

  function removeImage() {
    updatePage(activePage.id, (page) => ({
      ...page,
      image: undefined,
      imageName: undefined,
      imageFit: undefined,
      imagePositionX: undefined,
      imagePositionY: undefined,
      imagePlacementX: undefined,
      imagePlacementY: undefined,
      imageLocked: undefined,
    }));
    setSelectedImagePageId(null);
    setDraggingImage(false);
    imageDragRef.current = null;
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

  function handleChapterTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    textareaRef.current?.focus();
    const end = textareaRef.current?.value.length ?? 0;
    textareaRef.current?.setSelectionRange(end, end);
  }

  return (
    <div className="writer-view" onClickCapture={handleWorkspaceClick}>
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
            <span className="chapter-label">{activeChapter.title.trim() || "Untitled chapter"}</span>
          </div>

          <article
            ref={pageRef}
            className={`manuscript-page margin-${draft.style.margin} number-${draft.style.numberPosition}`}
            style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}
          >
            <div className="page-rule" />
            {draggingImage && selectedImagePageId === activePage.id && <div className="image-drag-boundary" aria-hidden="true" />}
            {activePageIndex === 0 && (
              <div className="chapter-page-heading" ref={chapterTitleRef}>
                <span>Chapter {activeChapterIndex + 1}</span>
                <input
                  value={activeChapter.title}
                  onChange={(event) => updateChapter(activeChapter.id, (chapter) => ({ ...chapter, title: event.target.value }))}
                  onKeyDown={handleChapterTitleKeyDown}
                  placeholder="Chapter Title"
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
                className={`page-image image-${activePage.imageFit ?? "contain"} ${selectedImagePageId === activePage.id ? "selected" : ""} ${activePage.imageLocked ? "locked" : ""}`}
                style={{ "--image-x": `${activePage.imagePositionX ?? 50}%`, "--image-y": `${activePage.imagePositionY ?? 50}%`, "--image-placement-x": `${activePage.imagePlacementX ?? 50}%`, "--image-placement-y": `${activePage.imagePlacementY ?? 72}%` } as React.CSSProperties}
                onPointerDown={handleImagePointerDown}
                onPointerMove={handleImagePointerMove}
                onPointerUp={finishImageDrag}
                onPointerCancel={finishImageDrag}
                onClick={(event) => { event.stopPropagation(); setSelectedImagePageId(activePage.id); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedImagePageId(activePage.id); }}
                role="button"
                tabIndex={0}
                aria-label={`${activePage.imageName || "Attached story illustration"}${activePage.imageLocked ? ", locked" : ", movable"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activePage.image} alt={activePage.imageName || "Attached story illustration"} draggable={false} />
                <figcaption>{activePage.imageName}</figcaption>
                {selectedImagePageId === activePage.id && (
                  <div className="page-image-controls" role="toolbar" aria-label="Image options" onPointerDown={(event) => event.stopPropagation()}>
                    <button type="button" className={activePage.imageFit === "fullscreen" ? "active" : ""} onClick={toggleImageFullPage} aria-label={activePage.imageFit === "fullscreen" ? "Restore image inside page" : "Make image full page"} aria-pressed={activePage.imageFit === "fullscreen"} title={activePage.imageFit === "fullscreen" ? "Restore image" : "Full page"}><Maximize2 size={16} /></button>
                    <button type="button" className="danger" onClick={removeImage} aria-label="Delete image" title="Delete image"><Trash2 size={16} /></button>
                    <button type="button" className={activePage.imageLocked ? "active" : ""} onClick={toggleImageLock} aria-label={activePage.imageLocked ? "Unlock image position" : "Lock image position"} aria-pressed={Boolean(activePage.imageLocked)} title={activePage.imageLocked ? "Unlock image" : "Lock image"}>{activePage.imageLocked ? <Lock size={16} /> : <Unlock size={16} />}</button>
                  </div>
                )}
              </figure>
            )}
            <span className="printed-page-number">{activeBookPageNumber}</span>
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
                const chapterName = chapter.title.trim() || "Untitled chapter";
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
                        <span><strong>{chapterName}</strong><small>{chapter.pages.length} {chapter.pages.length === 1 ? "page" : "pages"}</small></span>
                      </button>
                      <div className="chapter-row-actions">
                        <button className={`chapter-note-button ${chapter.notes.length ? "has-note" : ""}`} onClick={() => addNote(chapter.id)} aria-label={`Add a private note to ${chapterName}`}><Plus size={16} /></button>
                        <button className="more-button" onClick={() => setChapterMenu(chapterMenu === chapter.id ? null : chapter.id)} aria-label={`Options for ${chapterName}`} aria-expanded={chapterMenu === chapter.id}><MoreHorizontal size={18} /></button>
                      </div>
                      {chapterMenu === chapter.id && (
                        <div className="chapter-menu">
                          <button onClick={() => { setRenameChapterId(chapter.id); setChapterMenu(null); }}><Pencil size={14} /> Rename</button>
                          <button className="danger" disabled={draft.chapters.length === 1} onClick={() => { setDeleteChapterId(chapter.id); setChapterMenu(null); }}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                    {isActive && chapter.notes.map((note) => {
                      const isOpen = openNoteId === note.id;
                      return (
                        <div className={`chapter-note-branch ${isOpen ? "open" : "collapsed"}`} key={note.id} data-note-id={note.id}>
                          <span className="note-branch-line" aria-hidden="true" />
                          {isOpen ? (
                            <div className="chapter-note-card">
                              <div className="chapter-note-heading">
                                <span><LockKeyhole size={13} /> Private note</span>
                                <button data-delete-note onClick={() => setDeleteNoteTarget({ chapterId: chapter.id, noteId: note.id })} aria-label={`Delete note from ${chapterName}`}><Trash2 size={14} /></button>
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
                              </button>
                              <button className="chapter-note-summary-delete" data-delete-note onClick={() => setDeleteNoteTarget({ chapterId: chapter.id, noteId: note.id })} aria-label={`Delete note from ${chapterName}`}><Trash2 size={13} /></button>
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
      {deleteNoteTarget && <DeleteNoteDialog chapter={draft.chapters.find((chapter) => chapter.id === deleteNoteTarget.chapterId)!} onClose={() => setDeleteNoteTarget(null)} onDelete={() => deleteNote(deleteNoteTarget.chapterId, deleteNoteTarget.noteId)} />}
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
          <div><span className="eyebrow">PAGE OVERVIEW</span><h2 id="page-picker-title">{chapter.title.trim() || "Untitled chapter"}</h2><p>Select a page to continue writing there.</p></div>
          <button className="modal-close" onClick={onClose} aria-label="Close page overview"><X size={19} /></button>
        </header>
        <div className="page-picker-grid">
          {chapter.pages.map((page, index) => (
            <button className={page.id === activePageId ? "active" : ""} key={page.id} onClick={() => onSelect(index)} aria-label={`Go to page ${index + 1}`}>
              <span className="page-thumbnail">
                {index === 0 && <strong>{chapter.title.trim() || "Untitled chapter"}</strong>}
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
  const [chapterId, setChapterId] = useState(draft.activeChapterId);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  const selectedChapterIndex = Math.max(0, draft.chapters.findIndex((chapter) => chapter.id === chapterId));
  const selectedChapter = draft.chapters[selectedChapterIndex] ?? draft.chapters[0];
  const pageOffset = draft.chapters.slice(0, selectedChapterIndex).reduce((total, chapter) => total + chapter.pages.length, 0);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="story-preview-title">
      <div className="reader-modal" ref={panelRef}>
        <header>
          <div><span className="eyebrow">READER PREVIEW</span><h2 id="story-preview-title">{draft.title}</h2><p>{draft.genres.join(" · ")} · by Maya Santos</p></div>
          <label className="reader-chapter-select">
            <span>Preview chapter</span>
            <select value={selectedChapter.id} onChange={(event) => setChapterId(event.target.value)}>
              {draft.chapters.map((chapter, index) => <option value={chapter.id} key={chapter.id}>Chapter {index + 1}: {chapter.title.trim() || "Untitled chapter"}</option>)}
            </select>
          </label>
          <button className="icon-button" onClick={onClose} aria-label="Close story preview"><X size={19} /></button>
        </header>
        <div className="reader-pages" style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}>
          {selectedChapter.pages.map((page, pageIndex) => (
            <article className="reader-page" key={page.id}>
              {pageIndex === 0 && <><span className="reader-chapter-kicker">CHAPTER {selectedChapterIndex + 1}</span><h3>{selectedChapter.title.trim() || "Untitled chapter"}</h3></>}
              <p>{page.body || "This page is waiting to be written."}</p>
              {page.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={`reader-page-image image-${page.imageFit ?? "contain"}`}
                  style={{ objectPosition: `${page.imagePositionX ?? 50}% ${page.imagePositionY ?? 50}%`, "--image-placement-x": `${page.imagePlacementX ?? 50}%`, "--image-placement-y": `${page.imagePlacementY ?? 72}%` } as React.CSSProperties}
                  src={page.image}
                  alt="Story illustration"
                />
              )}
              <span>{pageOffset + pageIndex + 1}</span>
            </article>
          ))}
        </div>
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

function DeleteNoteDialog({ chapter, onClose, onDelete }: { chapter: Chapter; onClose: () => void; onDelete: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title" aria-describedby="delete-note-description">
      <div className="confirm-dialog" ref={panelRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close delete note dialog"><X size={19} /></button>
        <span className="confirm-icon danger"><Trash2 size={20} /></span>
        <h2 id="delete-note-title">Delete this private note?</h2>
        <p id="delete-note-description">This note from “{chapter.title.trim() || "Untitled chapter"}” will be permanently removed.</p>
        <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Keep note</button><button className="danger-button" onClick={onDelete}>Delete note</button></div>
      </div>
    </div>
  );
}
