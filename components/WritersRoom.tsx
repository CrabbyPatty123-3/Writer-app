"use client";

import {
  BookHeart,
  BookOpen,
  ChevronLeft,
  Compass,
  FileText,
  Home,
  Library,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommunityView from "./community/CommunityView";
import MyStoriesLibrary from "./writer/MyStoriesLibrary";
import WriterWorkspace from "./writer/WriterWorkspace";
import GenrePicker from "./writer/GenrePicker";
import { useModalKeyboard } from "./useModalKeyboard";
import { initialBooks, initialDraft, initialSocial, pageStyles } from "@/lib/seed";
import type { DraftStory, SocialState, View } from "@/lib/model";

const LEGACY_DRAFT_KEY = "writers-room-draft-v1";
const BOOKS_KEY = "writers-room-books-v3";
const ACTIVE_BOOK_KEY = "writers-room-active-book-v3";
const SOCIAL_KEY = "writers-room-social-v1";

const nav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "library" as const, label: "My Stories", icon: FileText },
  { id: "explore" as const, label: "Explore", icon: Compass },
];

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type StoredDraft = Partial<DraftStory> & { genre?: string };

function restoreBook(value: StoredDraft, fallbackTime: number): DraftStory {
  const restoredGenres = Array.isArray(value.genres)
    ? value.genres.filter((genre): genre is string => typeof genre === "string" && Boolean(genre.trim()))
    : [];
  if (!restoredGenres.length && typeof value.genre === "string" && value.genre.trim()) restoredGenres.push(value.genre.trim());
  return {
    ...initialDraft,
    ...value,
    genres: [...new Set(restoredGenres.length ? restoredGenres : initialDraft.genres)],
    coverColor: typeof value.coverColor === "string" ? value.coverColor : value.style?.accent ?? initialDraft.coverColor,
    chapters: (value.chapters ?? initialDraft.chapters).map((chapter) => {
      const storedNotes: unknown = chapter.notes;
      return {
        ...chapter,
        notes: Array.isArray(storedNotes)
          ? storedNotes.filter((note): note is { id: string; body: string } => Boolean(note) && typeof note.id === "string" && typeof note.body === "string")
          : typeof storedNotes === "string" && storedNotes.trim()
            ? [{ id: `note-${chapter.id}-legacy`, body: storedNotes }]
            : [],
      };
    }),
    status: value.status === "published" ? "published" : "draft",
    createdAt: typeof value.createdAt === "number" ? value.createdAt : fallbackTime,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : fallbackTime,
  };
}

export default function WritersRoom() {
  const [view, setView] = useState<View>("library");
  const [books, setBooks] = useState<DraftStory[]>(initialBooks);
  const [activeBookId, setActiveBookId] = useState(initialBooks[0].id);
  const [social, setSocial] = useState<SocialState>(initialSocial);
  const [hydrated, setHydrated] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [newBookOpen, setNewBookOpen] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState("Autosave on");

  const navigate = useCallback((nextView: View, bookId?: string) => {
    setView(nextView);
    if (bookId) setActiveBookId(bookId);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    if (bookId) url.searchParams.set("book", bookId);
    else if (nextView !== "write") url.searchParams.delete("book");
    window.history.pushState({ writersRoom: true, view: nextView, bookId }, "", url);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedView = url.searchParams.get("view");
    const initialView: View = requestedView === "home" || requestedView === "write" || requestedView === "explore" ? requestedView : "library";
    const initialBookId = url.searchParams.get("book") ?? undefined;
    const frame = window.requestAnimationFrame(() => {
      setView(initialView);
      if (initialBookId) setActiveBookId(initialBookId);
    });
    url.searchParams.set("view", initialView);
    window.history.replaceState({ writersRoom: true, view: initialView, bookId: initialBookId }, "", url);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { writersRoom?: boolean; view?: View; bookId?: string } | null;
      const poppedUrl = new URL(window.location.href);
      const urlView = poppedUrl.searchParams.get("view");
      const nextView = state?.writersRoom && state.view
        ? state.view
        : urlView === "home" || urlView === "write" || urlView === "explore" ? urlView : "library";
      setView(nextView);
      const nextBookId = state?.bookId ?? poppedUrl.searchParams.get("book");
      if (nextBookId) setActiveBookId(nextBookId);
      setFocusMode(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedBooks = window.localStorage.getItem(BOOKS_KEY);
        const legacyDraft = window.localStorage.getItem(LEGACY_DRAFT_KEY);
        const savedActiveBook = window.localStorage.getItem(ACTIVE_BOOK_KEY);
        const requestedBook = new URL(window.location.href).searchParams.get("book");
        const savedSocial = window.localStorage.getItem(SOCIAL_KEY);
        let restoredBooks = initialBooks;

        if (savedBooks) {
          const parsed = JSON.parse(savedBooks) as StoredDraft[];
          if (Array.isArray(parsed)) {
            restoredBooks = parsed.map((book, index) => restoreBook(book, Date.now() - index));
          }
        } else if (legacyDraft) {
          const migrated = restoreBook(JSON.parse(legacyDraft), Date.now());
          restoredBooks = [migrated, ...initialBooks.slice(1).filter((book) => book.id !== migrated.id)];
        }

        setBooks(restoredBooks);
        const preferredBook = requestedBook || savedActiveBook;
        setActiveBookId(restoredBooks.some((book) => book.id === preferredBook) ? preferredBook! : restoredBooks[0]?.id ?? "");
        if (savedSocial) setSocial(JSON.parse(savedSocial));
      } catch {
        // The local prototype remains usable when browser storage is unavailable or outdated.
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
        window.localStorage.setItem(ACTIVE_BOOK_KEY, activeBookId);
        setSaveStatus("Saved just now");
      } catch {
        setSaveStatus("Couldn’t save locally");
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeBookId, books, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SOCIAL_KEY, JSON.stringify(social));
    } catch {
      // Social prototype data remains in memory if local storage is unavailable.
    }
  }, [social, hydrated]);

  const activeDraft = useMemo(
    () => books.find((book) => book.id === activeBookId) ?? books[0],
    [activeBookId, books],
  );

  const setDraft = useCallback<Dispatch<SetStateAction<DraftStory>>>((update) => {
    setSaveStatus("Saving…");
    setBooks((currentBooks) => currentBooks.map((book) => {
      if (book.id !== activeBookId) return book;
      const updated = typeof update === "function" ? update(book) : update;
      return { ...updated, updatedAt: Date.now() };
    }));
  }, [activeBookId]);

  function openBook(bookId: string) {
    setFocusMode(false);
    navigate("write", bookId);
  }

  function createBook(details: { title: string; genres: string[]; synopsis: string; coverColor: string; coverData?: string; coverName?: string; coverType?: string }) {
    const now = Date.now();
    const pageId = uid("page");
    const chapterId = uid("chapter");
    const book: DraftStory = {
      id: uid("book"),
      title: details.title,
      genres: details.genres,
      synopsis: details.synopsis,
      coverColor: details.coverColor,
      coverData: details.coverData,
      coverName: details.coverName,
      coverType: details.coverType,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      activeChapterId: chapterId,
      activePageId: pageId,
      style: pageStyles[0],
      chapters: [{ id: chapterId, title: "", notes: [], pages: [{ id: pageId, body: "" }] }],
    };
    setBooks((current) => [book, ...current]);
    setNewBookOpen(false);
    navigate("write", book.id);
  }

  function updateBook(bookId: string, details: NewBookDetails) {
    setBooks((current) => current.map((book) => book.id === bookId
      ? { ...book, ...details, updatedAt: Date.now() }
      : book));
    setEditBookId(null);
  }

  function deleteBook(bookId: string) {
    const remaining = books.filter((book) => book.id !== bookId);
    setBooks(remaining);
    if (activeBookId === bookId) setActiveBookId(remaining[0]?.id ?? "");
    setDeleteBookId(null);
    if (view === "write" || !remaining.length) navigate("library");
  }

  const showCommunity = view === "home" || view === "explore";
  const showWorkspaceHeader = view === "home" || view === "explore" || view === "library";
  const navIsActive = (id: (typeof nav)[number]["id"]) => id === "library" ? view === "library" || view === "write" : view === id;

  return (
    <div className={`app-shell ${focusMode ? "focus-mode" : ""}`}>
      <aside className="sidebar" aria-label="Primary navigation">
        <button className="brand" onClick={() => navigate("home")} aria-label="Go home">
          <span className="brand-mark"><BookOpen size={25} /></span>
          <span className="brand-copy">Draftly<small>WRITE YOUR OWN</small></span>
        </button>

        <nav className="side-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={navIsActive(item.id) ? "active" : ""} onClick={() => navigate(item.id)}>
                <Icon size={20} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <BookHeart size={18} />
          <p><strong>Local prototype</strong><span>Your changes stay on this device.</span></p>
        </div>

        <button className="user-chip">
          <span className="avatar avatar-self">MS</span>
          <span><strong>Maya Santos</strong><small>@mayawrites</small></span>
          <UserRound size={16} />
        </button>
      </aside>

      <main className="main-shell">
        {showWorkspaceHeader && (
          <header className="community-topbar">
            <button className="mobile-back" aria-label="Open navigation"><Library size={20} /></button>
            <div className="top-search">
              <Search size={18} />
              <input
                aria-label={view === "library" ? "Search your books" : "Search stories and writers"}
                placeholder={view === "library" ? "Search your books" : "Search stories or writers"}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="topbar-actions">
              <button className="quiet-button" disabled={!activeDraft} onClick={() => activeDraft && navigate("write", activeDraft.id)}><ChevronLeft size={17} /> Continue writing</button>
              <button className="primary-button" onClick={() => setNewBookOpen(true)}><Plus size={17} /> New Book</button>
            </div>
          </header>
        )}

        {view === "library" && (
          <MyStoriesLibrary books={books} activeBookId={activeBookId} query={searchQuery} onOpen={openBook} onEdit={setEditBookId} onDelete={setDeleteBookId} onNewBook={() => setNewBookOpen(true)} />
        )}
        {view === "write" && activeDraft && (
          <WriterWorkspace key={activeDraft.id} draft={activeDraft} setDraft={setDraft} saveStatus={saveStatus} focusMode={focusMode} setFocusMode={setFocusMode} onEditBook={() => setEditBookId(activeDraft.id)} onDeleteBook={() => setDeleteBookId(activeDraft.id)} />
        )}
        {showCommunity && activeDraft && (
          <CommunityView
            mode={view}
            draft={activeDraft}
            social={social}
            setSocial={setSocial}
            query={searchQuery}
            onContinue={() => navigate("write", activeDraft.id)}
            onExplore={() => navigate("explore")}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={navIsActive(item.id) ? "active" : ""} onClick={() => navigate(item.id)}>
              <Icon size={19} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {newBookOpen && <BookDetailsDialog onClose={() => setNewBookOpen(false)} onSave={createBook} />}
      {editBookId && <BookDetailsDialog book={books.find((book) => book.id === editBookId)} onClose={() => setEditBookId(null)} onSave={(details) => updateBook(editBookId, details)} />}
      {deleteBookId && <DeleteBookDialog book={books.find((book) => book.id === deleteBookId)} onClose={() => setDeleteBookId(null)} onDelete={() => deleteBook(deleteBookId)} />}
    </div>
  );
}

type NewBookDetails = {
  title: string;
  genres: string[];
  synopsis: string;
  coverColor: string;
  coverData?: string;
  coverName?: string;
  coverType?: string;
};

function BookDetailsDialog({ book, onClose, onSave }: { book?: DraftStory; onClose: () => void; onSave: (details: NewBookDetails) => void }) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [genres, setGenres] = useState<string[]>(book?.genres ?? []);
  const [synopsis, setSynopsis] = useState(book?.synopsis ?? "");
  const [coverColor, setCoverColor] = useState(book?.coverColor ?? "#174f3b");
  const [coverData, setCoverData] = useState<string | undefined>(book?.coverData);
  const [coverName, setCoverName] = useState<string | undefined>(book?.coverName);
  const [coverType, setCoverType] = useState<string | undefined>(book?.coverType);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLFormElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  useModalKeyboard(panelRef, onClose);

  function chooseCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      setError("Choose a cover smaller than 2.5 MB for this local prototype.");
      event.target.value = "";
      return;
    }
    const supported = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!supported) {
      setError("Choose an image or PDF file for the cover.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCoverData(String(reader.result));
      setCoverName(file.name);
      setCoverType(file.type);
      setError("");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give your book a title before creating it.");
      return;
    }
    if (!genres.length) {
      setError("Choose at least one genre, or type your own.");
      return;
    }
    onSave({ title: title.trim(), genres, synopsis: synopsis.trim(), coverColor, coverData, coverName, coverType });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="book-details-title">
      <form className="publish-dialog new-book-dialog" onSubmit={submit} ref={panelRef}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close new book dialog"><X size={19} /></button>
        <span className="publish-icon"><BookOpen size={23} /></span>
        <span className="eyebrow">{book ? "BOOK SETTINGS" : "A NEW BEGINNING"}</span>
        <h2 id="book-details-title">{book ? "Edit book details" : "Start a new book"}</h2>
        <p>{book ? "Update how this book appears in your library." : "You can change these details at any time."}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="new-book-setup">
          <div className="cover-builder">
            <span className="form-section-label">Book cover</span>
            <div className="cover-preview" style={{ "--cover-color": coverColor } as React.CSSProperties}>
              {coverData && coverType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverData} alt="Selected book cover preview" />
              ) : coverData ? (
                <span className="pdf-cover"><FileText size={26} /><small>PDF COVER</small></span>
              ) : (
                <><small>{genres[0] || "YOUR GENRE"}</small><strong>{title || "Untitled Book"}</strong><span>Maya Santos</span></>
              )}
            </div>
            <label className="cover-color-control">Cover color<input type="color" value={coverColor} onChange={(event) => setCoverColor(event.target.value)} /></label>
            <button className="secondary-button cover-upload" type="button" onClick={() => coverInputRef.current?.click()}><Plus size={16} /> Attach image or PDF</button>
            <input ref={coverInputRef} className="visually-hidden" type="file" accept="image/*,.pdf,application/pdf" onChange={chooseCover} />
            {coverName && <div className="cover-file-row"><span title={coverName}>{coverName}</span><button type="button" onClick={() => { setCoverData(undefined); setCoverName(undefined); setCoverType(undefined); }} aria-label="Remove attached cover"><X size={14} /></button></div>}
          </div>
          <div className="book-detail-fields">
            <label>Book title<input value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} autoComplete="off" /></label>
            <GenrePicker value={genres} onChange={(next) => { setGenres(next); setError(""); }} />
            <label>Short description<textarea value={synopsis} onChange={(event) => setSynopsis(event.target.value)} placeholder="What is your story about?" /></label>
          </div>
        </div>
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{book ? <Pencil size={16} /> : <Plus size={16} />} {book ? "Save changes" : "Create book"}</button></div>
      </form>
    </div>
  );
}

function DeleteBookDialog({ book, onClose, onDelete }: { book?: DraftStory; onClose: () => void; onDelete: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  if (!book) return null;
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-book-title" aria-describedby="delete-book-description">
      <div className="confirm-dialog" ref={panelRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close delete book dialog"><X size={19} /></button>
        <span className="confirm-icon danger"><Trash2 size={20} /></span>
        <h2 id="delete-book-title">Delete “{book.title}”?</h2>
        <p id="delete-book-description">All of its chapters, pages, images, and private notes will be removed from this device.</p>
        <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Keep book</button><button className="danger-button" onClick={onDelete}>Delete book</button></div>
      </div>
    </div>
  );
}
