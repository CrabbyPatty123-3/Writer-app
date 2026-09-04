# Writers' Room prototype

A local, interactive prototype for a page-first book writing and publishing app.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Included in this prototype

- Page-card writing with automatic text overflow
- Multiple pages per chapter
- Chapter creation, renaming, deletion, selection, and drag reordering
- Private per-chapter outline notes with Tab indentation
- Page illustration attachment and overflow handling
- Automatic local saving and return to the latest chapter
- Ready-made page styles plus custom paper, ink, and accent colors
- Reader preview and a genre-aware publishing dialog
- Dummy story feed, writer profiles, follows, reactions, ratings, and comments
- Responsive desktop and mobile layouts

## Prototype boundaries

All state is stored in the browser. Publishing and community interactions are simulated and do not send data to a server. Image attachments are limited to 2.5 MB to stay within local browser storage constraints.

