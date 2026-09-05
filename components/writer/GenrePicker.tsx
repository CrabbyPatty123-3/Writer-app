"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import { KeyboardEvent, useId, useMemo, useState } from "react";

export const COMMON_GENRES = [
  "Romance",
  "Action",
  "Adventure",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Supernatural",
  "Science Fiction",
  "Literary",
  "Historical Fiction",
  "Horror",
  "Young Adult",
];

type Props = {
  value: string[];
  onChange: (genres: string[]) => void;
  label?: string;
};

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function GenrePicker({ value, onChange, label = "Genres" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return COMMON_GENRES.filter((genre) => (
      !value.some((selected) => selected.toLowerCase() === genre.toLowerCase())
      && (!needle || genre.toLowerCase().includes(needle))
    ));
  }, [query, value]);

  function addGenre(raw: string) {
    const genre = normalized(raw);
    if (!genre) return;
    if (!value.some((selected) => selected.toLowerCase() === genre.toLowerCase())) {
      onChange([...value, genre]);
    }
    setQuery("");
    setOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addGenre(query || suggestions[0] || "");
    } else if (event.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <fieldset className="genre-picker">
      <legend>{label}</legend>
      <div className="genre-input-shell">
        <div className="genre-chips" aria-label="Selected genres">
          {value.map((genre) => (
            <span key={genre} className="genre-chip">
              {genre}
              <button type="button" onClick={() => onChange(value.filter((item) => item !== genre))} aria-label={`Remove ${genre}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="genre-combobox">
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length ? "Add another genre…" : "Choose or type a genre…"}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
          />
          <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Show genre choices"><ChevronDown size={16} /></button>
        </div>
      </div>
      <small>Choose several, or type your own and press Enter.</small>
      {open && (
        <div className="genre-options" id={listId} role="listbox">
          {query.trim() && !COMMON_GENRES.some((genre) => genre.toLowerCase() === query.trim().toLowerCase()) && (
            <button type="button" role="option" aria-selected="false" onClick={() => addGenre(query)}>
              <Plus size={15} /><span>Create “{normalized(query)}”</span>
            </button>
          )}
          {suggestions.map((genre) => (
            <button type="button" role="option" aria-selected="false" key={genre} onClick={() => addGenre(genre)}>
              <span>{genre}</span><Check size={14} />
            </button>
          ))}
          {!suggestions.length && !query.trim() && <p>All suggested genres are selected.</p>}
        </div>
      )}
    </fieldset>
  );
}
