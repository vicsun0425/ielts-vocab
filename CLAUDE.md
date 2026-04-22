# CLAUDE.md — IELTS Vocabulary Tool

## Project Overview

An IELTS vocabulary tool where users paste English articles and get back new words (beyond middle school level) with phonetics, definitions, example sentences, and British pronunciation audio.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon (PostgreSQL) — optional, requires `DATABASE_URL` env var
- **Dictionary API**: api.dictionaryapi.dev (free, no API key)

## Project Structure

```
src/
  app/
    page.tsx                  # Server component, fetches saved dates
    layout.tsx                # Root layout
    api/analyze/route.ts      # POST: extract + lookup new words
    api/articles/route.ts     # GET/POST/DELETE: article CRUD
  components/
    client-app.tsx            # Main client component (state, events)
    calendar.tsx              # Date picker with article indicators
    word-list.tsx             # Word cards with audio button
  lib/
    dictionary.ts             # Word extraction + dictionary API lookup
    known-words.ts            # Middle school vocabulary word list
    db.ts                     # Neon database operations
```

## Key Conventions

- Database is optional — app works without `DATABASE_URL` (save feature just won't work)
- Word extraction: Free Dictionary API, batch of 5 concurrent lookups
- British audio: Web Speech API with `en-GB` voice preference
- Known words list defines the "middle school level" threshold
- Every code change: update CHANGELOG.md and push to GitHub

## Git Workflow

- After every change, update CHANGELOG.md and `git push` to `vicsun0425/ielts-vocab`
