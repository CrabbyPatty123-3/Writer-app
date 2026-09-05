"use client";

import {
  ArrowRight,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Star,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Dispatch, FormEvent, SetStateAction, useRef, useState } from "react";
import { useModalKeyboard } from "@/components/useModalKeyboard";
import { authors, publishedStories } from "@/lib/seed";
import type { Author, DraftStory, PublishedStory, SocialState, View } from "@/lib/model";

type Props = {
  mode: Extract<View, "home" | "explore">;
  draft: DraftStory;
  social: SocialState;
  setSocial: Dispatch<SetStateAction<SocialState>>;
  query: string;
  onContinue: () => void;
  onExplore: () => void;
};

export default function CommunityView({ mode, draft, social, setSocial, query, onContinue, onExplore }: Props) {
  const [openStory, setOpenStory] = useState<PublishedStory | null>(null);
  const [openAuthor, setOpenAuthor] = useState<Author | null>(null);
  const [filter, setFilter] = useState("All");
  const genres = ["All", "Romance", "Fantasy", "Mystery", "Supernatural"];
  const normalizedQuery = query.trim().toLowerCase();
  const modeStories = mode === "home"
    ? publishedStories.filter((story) => social.following.includes(story.authorId))
    : filter === "All" ? publishedStories : publishedStories.filter((story) => story.genre === filter);
  const stories = normalizedQuery
    ? modeStories.filter((story) => {
        const author = authors.find((item) => item.id === story.authorId);
        return `${story.title} ${story.genre} ${story.synopsis} ${author?.name ?? ""}`.toLowerCase().includes(normalizedQuery);
      })
    : modeStories;
  const currentChapter = draft.chapters.find((chapter) => chapter.id === draft.activeChapterId) ?? draft.chapters[0];
  const currentPageNumber = Math.max(1, currentChapter.pages.findIndex((page) => page.id === draft.activePageId) + 1);

  function toggleFollow(authorId: string) {
    setSocial((current) => ({ ...current, following: current.following.includes(authorId) ? current.following.filter((id) => id !== authorId) : [...current.following, authorId] }));
  }

  return (
    <section className="community-view">
      {mode === "home" ? (
        <>
          <div className="welcome-row"><div><span className="eyebrow">YOUR WRITING SPACE</span><h1>Good afternoon, Maya.</h1><p>A quiet place to keep writing—and find something worth reading.</p></div><div className="daily-word"><span>THIS WEEK</span><strong>1,284</strong><small>words written</small></div></div>
          <button className="continue-card" onClick={onContinue}>
            <div className="mini-cover"><span>THE</span><strong>LIGHTHOUSE<br />KEEPER</strong><i /></div>
            <div className="continue-copy"><span className="eyebrow">CONTINUE WHERE YOU LEFT OFF</span><h2>{draft.title}</h2><p>{currentChapter.title} · Page {currentPageNumber}</p><span className="continue-action">Continue writing <ArrowRight size={17} /></span></div>
            <div className="continue-progress"><span>{draft.chapters.filter((chapter) => chapter.pages.some((page) => page.body)).length} / {draft.chapters.length}</span><small>chapters started</small></div>
          </button>

          <div className="content-heading"><div><span className="eyebrow">FROM WRITERS YOU FOLLOW</span><h2>Fresh chapters</h2></div><button onClick={onExplore}>View all <ArrowRight size={16} /></button></div>
        </>
      ) : (
        <div className="explore-heading"><span className="eyebrow">DISCOVER YOUR NEXT READ</span><h1>Explore stories</h1><p>New worlds, unfinished adventures, and writers worth following.</p><div className="genre-tabs">{genres.map((genre) => <button className={filter === genre ? "active" : ""} key={genre} onClick={() => setFilter(genre)}>{genre}</button>)}</div></div>
      )}

      <div className="story-grid">
        {stories.map((story) => {
          const author = authors.find((item) => item.id === story.authorId)!;
          const following = social.following.includes(author.id);
          return (
            <article className="story-card" key={story.id}>
              <button className="cover-button" onClick={() => setOpenStory(story)} aria-label={`Read ${story.title}`}>
                <span className="book-cover" style={{ background: story.cover, "--cover-accent": story.coverAccent } as React.CSSProperties}><i>{story.genre}</i><strong>{story.title}</strong><small>{author.name}</small><b /></span>
              </button>
              <div className="story-info"><span className="genre-pill">{story.genre}</span><button className="story-title" onClick={() => setOpenStory(story)}>{story.title}</button><p>{story.synopsis}</p></div>
              <div className="story-author"><button className="author-button" onClick={() => setOpenAuthor(author)}><span className="avatar" style={{ background: author.accent }}>{author.initials}</span><span><strong>{author.name}</strong><small>{author.handle}</small></span></button><button className={`follow-mini ${following ? "following" : ""}`} onClick={() => toggleFollow(author.id)}>{following ? "Following" : "Follow"}</button></div>
              <div className="story-stats"><span><Star size={14} fill="currentColor" /> {story.rating}</span><span><Heart size={14} /> {(story.likes / 1000).toFixed(1)}k</span><span><MessageCircle size={14} /> {social.comments[story.id]?.length ?? 0}</span></div>
            </article>
          );
        })}
      </div>

      {!stories.length && (
        <div className="community-empty">
          <BookOpenText size={30} />
          <h2>{mode === "home" ? "Your followed-writer shelf is quiet" : "No stories found"}</h2>
          <p>{mode === "home" ? "Follow a writer in Explore and their stories will appear here." : "Try another genre or search term."}</p>
          {mode === "home" && <button className="primary-button" onClick={onExplore}>Explore writers</button>}
        </div>
      )}

      {openStory && <PublicReader story={openStory} social={social} setSocial={setSocial} onClose={() => setOpenStory(null)} onAuthor={() => { setOpenStory(null); setOpenAuthor(authors.find((author) => author.id === openStory.authorId)!); }} />}
      {openAuthor && <AuthorProfile author={openAuthor} stories={publishedStories.filter((story) => story.authorId === openAuthor.id)} following={social.following.includes(openAuthor.id)} onFollow={() => toggleFollow(openAuthor.id)} onClose={() => setOpenAuthor(null)} onStory={(story) => { setOpenAuthor(null); setOpenStory(story); }} />}
    </section>
  );
}

function PublicReader({ story, social, setSocial, onClose, onAuthor }: { story: PublishedStory; social: SocialState; setSocial: Dispatch<SetStateAction<SocialState>>; onClose: () => void; onAuthor: () => void }) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [comment, setComment] = useState("");
  const author = authors.find((item) => item.id === story.authorId)!;
  const liked = social.liked.includes(story.id);
  const disliked = social.disliked.includes(story.id);
  const rating = social.ratings[story.id] ?? 0;
  const comments = social.comments[story.id] ?? [];
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);

  function react(kind: "like" | "dislike") {
    setSocial((current) => {
      if (kind === "like") return { ...current, liked: liked ? current.liked.filter((id) => id !== story.id) : [...current.liked, story.id], disliked: current.disliked.filter((id) => id !== story.id) };
      return { ...current, disliked: disliked ? current.disliked.filter((id) => id !== story.id) : [...current.disliked, story.id], liked: current.liked.filter((id) => id !== story.id) };
    });
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setSocial((current) => ({ ...current, comments: { ...current.comments, [story.id]: [{ id: `comment-${Date.now()}`, author: "Maya Santos", body: comment.trim(), when: "now" }, ...(current.comments[story.id] ?? [])] } }));
    setComment("");
  }

  return (
    <div className="modal-backdrop reader-backdrop" role="dialog" aria-modal="true" aria-labelledby={`reader-title-${story.id}`}>
      <div className="public-reader" ref={panelRef}>
        <header><button className="reader-back" onClick={onClose}><ChevronLeft size={18} /> Explore</button><div><strong id={`reader-title-${story.id}`}>{story.title}</strong><button onClick={onAuthor}>by {author.name}</button></div><button className="icon-button" onClick={onClose} aria-label="Close reader"><X size={19} /></button></header>
        <div className="public-reader-body">
          <section className="reading-stage">
            <div className="reading-meta"><span>{story.genre}</span><span>Chapter {chapterIndex + 1} of {story.chapters.length}</span></div>
            <article className="reading-page">
              <span className="reader-chapter-kicker">CHAPTER {chapterIndex + 1}</span>
              <h1>{story.chapters[chapterIndex].title}</h1>
              <p>{story.chapters[chapterIndex].body}</p>
              <p className="reader-filler">The rest of this chapter is represented by dummy content in the prototype. Its final layout will use the writer&apos;s selected page style, images, and automatic page breaks.</p>
              <small>{chapterIndex + 1}</small>
            </article>
            <div className="reader-navigation"><button disabled={chapterIndex === 0} onClick={() => setChapterIndex((index) => index - 1)}><ChevronLeft size={18} /> Previous</button><button disabled={chapterIndex === story.chapters.length - 1} onClick={() => setChapterIndex((index) => index + 1)}>Next chapter <ChevronRight size={18} /></button></div>
          </section>
          <aside className="engagement-panel">
            <button className="reader-author" onClick={onAuthor}><span className="avatar" style={{ background: author.accent }}>{author.initials}</span><span><strong>{author.name}</strong><small>{author.bio}</small></span></button>
            <div className="reaction-row"><button aria-label={liked ? "Remove like" : "Like story"} aria-pressed={liked} className={liked ? "active" : ""} onClick={() => react("like")}><ThumbsUp size={18} /> <span>{story.likes + (liked ? 1 : 0)}</span></button><button aria-label={disliked ? "Remove dislike" : "Dislike story"} aria-pressed={disliked} className={disliked ? "active dislike" : ""} onClick={() => react("dislike")}><ThumbsDown size={18} /> <span>{story.dislikes + (disliked ? 1 : 0)}</span></button></div>
            <div className="rating-box"><strong>Rate this story</strong><div>{[1, 2, 3, 4, 5].map((value) => <button aria-label={`Rate ${value} stars`} aria-pressed={rating === value} key={value} onClick={() => setSocial((current) => ({ ...current, ratings: { ...current.ratings, [story.id]: value } }))}><Star size={21} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div><small>{rating ? `Your rating: ${rating}/5` : `${story.rating} average from ${story.ratingCount} readers`}</small></div>
            <div className="comments-box"><h3>Reader comments <span>{comments.length}</span></h3><form onSubmit={submitComment}><input aria-label="Write a comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave a thoughtful comment…" /><button type="submit">Post</button></form><div className="comments-list">{comments.map((item) => <div key={item.id}><span className="avatar tiny">{item.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><p><strong>{item.author}<small>{item.when}</small></strong>{item.body}</p></div>)}</div></div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function AuthorProfile({ author, stories, following, onFollow, onClose, onStory }: { author: Author; stories: PublishedStory[]; following: boolean; onFollow: () => void; onClose: () => void; onStory: (story: PublishedStory) => void }) {
  const followerCount = author.followers + (following ? 1 : 0);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(panelRef, onClose);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={`author-title-${author.id}`}>
      <div className="profile-modal" ref={panelRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close author profile"><X size={19} /></button>
        <span className="avatar profile-avatar" style={{ background: author.accent }}>{author.initials}</span>
        <h2 id={`author-title-${author.id}`}>{author.name}</h2><span>{author.handle}</span><p>{author.bio}</p>
        <div className="profile-stats"><span><strong>{followerCount.toLocaleString()}</strong>Followers</span><span><strong>{stories.length}</strong>Published</span><span><strong>{stories.reduce((sum, story) => sum + story.likes, 0).toLocaleString()}</strong>Likes</span></div>
        <button className={`profile-follow ${following ? "following" : ""}`} onClick={onFollow}>{following ? <><Users size={17} /> Following</> : <><UserPlus size={17} /> Follow writer</>}</button>
        <div className="profile-books"><span className="eyebrow">PUBLISHED STORIES</span>{stories.map((story) => <button key={story.id} onClick={() => onStory(story)}><span style={{ background: story.cover }} /><div><strong>{story.title}</strong><small>{story.genre} · {story.rating} ★</small></div><ArrowRight size={16} /></button>)}</div>
      </div>
    </div>
  );
}
