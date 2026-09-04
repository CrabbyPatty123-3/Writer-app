"use client";

import { ArrowLeft, Check, Paintbrush, SlidersHorizontal } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { pageStyles } from "@/lib/seed";
import type { DraftStory, PageStyle } from "@/lib/model";

type Props = { draft: DraftStory; setDraft: Dispatch<SetStateAction<DraftStory>>; onWrite: () => void };

export default function StyleStudio({ draft, setDraft, onWrite }: Props) {
  function setStyle(style: PageStyle) {
    setDraft((current) => ({ ...current, style }));
  }

  function patchStyle(patch: Partial<PageStyle>) {
    setDraft((current) => ({ ...current, style: { ...current.style, id: "custom", name: "My Custom Style", ...patch } }));
  }

  return (
    <section className="style-view">
      <header className="section-header">
        <div><span className="eyebrow">BOOK APPEARANCE</span><h1>Page Styles</h1><p>Choose how your story feels on the page. Your words stay exactly the same.</p></div>
        <button className="primary-button" onClick={onWrite}><ArrowLeft size={17} /> Return to writing</button>
      </header>

      <div className="style-layout">
        <div>
          <div className="section-title"><div><Paintbrush size={18} /><span><strong>Ready-made styles</strong><small>Margins, page numbers, paper and ink</small></span></div></div>
          <div className="style-grid">
            {pageStyles.map((style) => (
              <button className={`style-card ${draft.style.id === style.id ? "selected" : ""}`} key={style.id} onClick={() => setStyle(style)}>
                <span className={`style-sheet margin-${style.margin}`} style={{ background: style.paper, color: style.ink, borderColor: style.accent }}>
                  <i style={{ background: style.accent }} />
                  <strong>A beginning</strong>
                  <em />
                  <em />
                  <em className="short" />
                  <small className={`sample-number ${style.numberPosition}`}>12</small>
                </span>
                <span className="style-name"><strong>{style.name}</strong><small>{style.margin} margins · number {style.numberPosition}</small></span>
                {draft.style.id === style.id && <span className="selected-check"><Check size={14} /></span>}
              </button>
            ))}
          </div>

          <div className="customizer">
            <div className="section-title"><div><SlidersHorizontal size={18} /><span><strong>Make it yours</strong><small>Fine-tune the selected style</small></span></div></div>
            <div className="color-controls">
              <label><span>Paper</span><input type="color" value={draft.style.paper} onChange={(event) => patchStyle({ paper: event.target.value })} /><code>{draft.style.paper}</code></label>
              <label><span>Ink</span><input type="color" value={draft.style.ink} onChange={(event) => patchStyle({ ink: event.target.value })} /><code>{draft.style.ink}</code></label>
              <label><span>Accent</span><input type="color" value={draft.style.accent} onChange={(event) => patchStyle({ accent: event.target.value })} /><code>{draft.style.accent}</code></label>
            </div>
          </div>
        </div>

        <aside className="style-preview-wrap">
          <span className="eyebrow">LIVE PREVIEW</span>
          <article className={`style-preview margin-${draft.style.margin}`} style={{ "--paper": draft.style.paper, "--ink": draft.style.ink, "--page-accent": draft.style.accent } as React.CSSProperties}>
            <span>CHAPTER TWO</span>
            <h2>A Light Beneath the Water</h2>
            <p>Every morning, Elias lit the lamp at the top of the cliff. The sea was his companion, steady and silent.</p>
            <p>That morning, another light answered from beneath the water.</p>
            <small>12</small>
          </article>
          <p>Readers see this style. Your private notes and editor controls never appear.</p>
        </aside>
      </div>
    </section>
  );
}
