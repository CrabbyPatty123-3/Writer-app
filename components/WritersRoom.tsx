"use client";

import {
  BookHeart,
  BookOpen,
  ChevronLeft,
  Compass,
  FileText,
  Home,
  Library,
  Palette,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import CommunityView from "./community/CommunityView";
import WriterWorkspace from "./writer/WriterWorkspace";
import StyleStudio from "./writer/StyleStudio";
import { initialDraft, initialSocial } from "@/lib/seed";
import type { DraftStory, SocialState, View } from "@/lib/model";

const DRAFT_KEY = "writers-room-draft-v1";
const SOCIAL_KEY = "writers-room-social-v1";

const nav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "write" as const, label: "My Stories", icon: FileText },
  { id: "styles" as const, label: "Page Styles", icon: Palette },
  { id: "explore" as const, label: "Explore", icon: Compass },
];

export default function WritersRoom() {
  const [view, setView] = useState<View>("write");
  const [draft, setDraft] = useState<DraftStory>(initialDraft);
  const [social, setSocial] = useState<SocialState>(initialSocial);
  const [hydrated, setHydrated] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedDraft = window.localStorage.getItem(DRAFT_KEY);
        const savedSocial = window.localStorage.getItem(SOCIAL_KEY);
        if (savedDraft) setDraft(JSON.parse(savedDraft));
        if (savedSocial) setSocial(JSON.parse(savedSocial));
      } catch {
        // The prototype remains usable if local storage is unavailable.
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Large local image previews may exceed a browser's prototype storage limit.
    }
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SOCIAL_KEY, JSON.stringify(social));
  }, [social, hydrated]);

  const showCommunity = view === "home" || view === "explore";

  return (
    <div className={`app-shell ${focusMode ? "focus-mode" : ""}`}>
      <aside className="sidebar" aria-label="Primary navigation">
        <button className="brand" onClick={() => setView("home")} aria-label="Go home">
          <span className="brand-mark"><BookOpen size={25} /></span>
          <span className="brand-copy">Writers&apos; Room<small>shape a story</small></span>
        </button>

        <nav className="side-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => setView(item.id)}
              >
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
        {showCommunity && (
          <header className="community-topbar">
            <button className="mobile-back" aria-label="Navigation"><Library size={20} /></button>
            <div className="top-search"><Search size={18} /><input aria-label="Search stories and writers" placeholder="Search stories or writers" /></div>
            <button className="quiet-button" onClick={() => setView("write")}><ChevronLeft size={17} /> Continue writing</button>
          </header>
        )}

        {view === "write" && (
          <WriterWorkspace
            draft={draft}
            setDraft={setDraft}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
          />
        )}
        {view === "styles" && <StyleStudio draft={draft} setDraft={setDraft} onWrite={() => setView("write")} />}
        {showCommunity && (
          <CommunityView
            mode={view}
            draft={draft}
            social={social}
            setSocial={setSocial}
            onContinue={() => setView("write")}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <Icon size={19} /><span>{item.label === "Page Styles" ? "Styles" : item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
