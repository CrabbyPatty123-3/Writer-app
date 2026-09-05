"use client";

import { BookOpen, CheckCircle2, Clock3, FilePenLine, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import type { DraftStory } from "@/lib/model";

type Props = {
  books: DraftStory[];
  activeBookId: string;
  query: string;
  onOpen: (bookId: string) => void;
  onEdit: (bookId: string) => void;
  onDelete: (bookId: string) => void;
  onNewBook: () => void;
};

function bookStats(book: DraftStory) {
  const pages = book.chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0);
  const started = book.chapters.filter((chapter) => chapter.pages.some((page) => page.body.trim() || page.image)).length;
  return { pages, started };
}

function relativeUpdate(timestamp: number) {
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "Updated Today";
  if (days === 1) return "Updated Yesterday";
  if (days < 30) return `Updated ${days} days ago`;
  return `Updated ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(timestamp)}`;
}

export default function MyStoriesLibrary({ books, activeBookId, query, onOpen, onEdit, onDelete, onNewBook }: Props) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBooks = normalizedQuery
    ? books.filter((book) => `${book.title} ${book.genres.join(" ")} ${book.synopsis}`.toLowerCase().includes(normalizedQuery))
    : books;
  const published = books.filter((book) => book.status === "published").length;

  return (
    <section className="library-view">
      <header className="library-heading">
        <div>
          <span className="eyebrow">YOUR BOOKSHELF</span>
          <h1>My Stories</h1>
          <p>Every book you have started, whether it is still taking shape or already published.</p>
        </div>
        <dl className="library-summary" aria-label="Book totals">
          <div><dt>Books</dt><dd>{books.length}</dd></div>
          <div><dt>Drafts</dt><dd>{books.length - published}</dd></div>
          <div><dt>Published</dt><dd>{published}</dd></div>
        </dl>
      </header>

      {visibleBooks.length ? (
        <div className="library-grid">
          {visibleBooks.map((book) => {
            const { pages, started } = bookStats(book);
            const current = book.id === activeBookId;
            return (
              <article
                className={`library-card ${current ? "current" : ""}`}
                key={book.id}
                onClick={() => onOpen(book.id)}
                onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) onOpen(book.id); }}
                role="link"
                tabIndex={0}
                aria-label={`Open ${book.title}`}
              >
                <div className="library-cover-button">
                  <span
                    className="library-book-cover"
                    style={{ "--book-paper": book.style.paper, "--book-ink": book.style.ink, "--book-accent": book.style.accent, "--book-cover": book.coverColor } as React.CSSProperties}
                  >
                    {book.coverData && book.coverType?.startsWith("image/") && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="library-cover-image" src={book.coverData} alt="" />
                    )}
                    {book.coverData && book.coverType === "application/pdf" && <span className="library-pdf-cover"><FileText size={30} /><small>PDF COVER</small></span>}
                    <span className="library-cover-copy">
                      <small>{book.genres.join(" • ")}</small>
                      <strong>{book.title}</strong>
                      <i>Maya Santos</i>
                    </span>
                  </span>
                </div>
                <div className="library-card-copy">
                  <div className="book-status-row">
                    <span className={`book-status ${book.status}`}>
                      {book.status === "published" ? <CheckCircle2 size={14} /> : <FilePenLine size={14} />}
                      {book.status === "published" ? "Published" : "Draft"}
                    </span>
                    {current && <span className="current-book">Last opened</span>}
                  </div>
                  <h2 className="library-book-title">{book.title}</h2>
                  <p>{book.synopsis || "This book does not have a description yet."}</p>
                  <div className="library-book-meta">
                    <span><BookOpen size={15} /> {book.chapters.length} chapters</span>
                    <span>{pages} {pages === 1 ? "page" : "pages"}</span>
                  </div>
                  <div className="library-progress" aria-label={`${started} of ${book.chapters.length} chapters started`}>
                    <span style={{ width: `${Math.max(6, (started / book.chapters.length) * 100)}%` }} />
                  </div>
                  <div className="library-card-footer">
                    <span><Clock3 size={14} /> {relativeUpdate(book.updatedAt)}</span>
                  </div>
                  <div className="library-book-actions">
                    <button onClick={(event) => { event.stopPropagation(); onEdit(book.id); }}><Pencil size={14} /> Edit</button>
                    <button className="danger" onClick={(event) => { event.stopPropagation(); onDelete(book.id); }}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              </article>
            );
          })}

          <button className="new-book-card" onClick={onNewBook}>
            <span><Plus size={24} /></span>
            <strong>Start a new book</strong>
            <small>Begin with a blank, formatted page.</small>
          </button>
        </div>
      ) : (
        <div className="library-empty">
          <BookOpen size={30} />
          <h2>{books.length ? `No books match “${query}”` : "Your bookshelf is empty"}</h2>
          <p>{books.length ? "Try a title, genre, or a word from the description." : "Start a new book whenever you are ready."}</p>
          {!books.length && <button className="primary-button" onClick={onNewBook}><Plus size={16} /> New Book</button>}
        </div>
      )}
    </section>
  );
}
