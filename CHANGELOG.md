# Changelog

## [0.5.0] - 2026-04-23

### PDF Export with Embedded Audio
- New "Download PDF" button generates a PDF with word cards and embedded audio attachments
- Each word has a speaker icon that links to an embedded .m4a pronunciation file
- Uses PyMuPDF (Python) for PDF generation + macOS `say` command for TTS
- Audio is embedded directly in the PDF — works offline, no network needed
- Falls back gracefully on non-macOS platforms (returns error message)

### PDF Export Fixes
- Card-based layout: 3+ words per page with reasonable spacing instead of one word per page
- CJK font embedding: Chinese definitions now display correctly using Hiragino Sans GB
- Audio file annotations properly linked to speaker icons for each word card

### KNOWN_WORDS Cleanup
- Deduplicated known words list: 4404 entries → 3290 unique words
- Added `scripts/clean-known-words.py` for future cleanup runs

### Dictionary Lookup Caching
- All Dictionary API + MyMemory API results are now cached to `src/data/dictionary-cache.json`
- Re-analyzing the same text is now instant (< 50ms vs ~13s)
- Cache persists across server restarts
- Atomic writes prevent corruption from concurrent requests

### Lemma-based Word Filtering
- Words like "went", "children", "better" are now correctly filtered as inflected forms of known words
- Uses `src/lib/lemma-map.json` for irregular forms (~150 word families)
- Rule-based fallback handles regular suffixes (-s, -ed, -ing, -ies)

### Fix Page Load Memory Crash
- Changed `ocr-upload.tsx` from static `import { createWorker } from 'tesseract.js'` to dynamic `await import('tesseract.js')`
- Tesseract.js (WASM engine + language models) is now only loaded when the user actually uploads an image, not on every page load

## [0.4.2] - 2026-04-22

### Fix Dev Server Freeze
- Set `turbopack.root` in next.config.ts to point to the correct project directory, preventing Turbopack from resolving modules from the parent workspace
- Removed stray `package.json` and `package-lock.json` from the parent directory that were confusing Turbopack's workspace root detection
- Fixed `saveArticle` double-encoding words: removed `JSON.stringify()` since postgres.js already serializes JS objects to JSONB
- Converted existing database records from double-encoded string format back to proper JSONB arrays

## [0.4.1] - 2026-04-22

### Memory & Concurrency Fixes
- Audio generation now processes words in batches of 3 instead of all at once, preventing memory spikes
- Switched from synchronous `execSync` to async `exec` with `Promise`-based concurrency control
- Export buttons now guard against double-clicks/concurrent calls
- Article export button shows disabled state while generating

## [0.4.0] - 2026-04-22

### Saved Exports with Download Links
- Exports are automatically saved to the server's `/exports` directory
- Saved exports list displayed on the main page
- Each saved export has a direct Download button for re-downloading
- No need to regenerate — just download from the saved list

## [0.3.0] - 2026-04-22

### Chinese Translations & Improved Exports
- Chinese translations for each word definition via MyMemory API
- Two export modes: Web (lightweight) and Audio (offline with embedded audio)
- Export button always visible when words are available
- Historical article export buttons
- Export API endpoint at `/api/export`
- Chinese README with full documentation

## [0.2.0] - 2026-04-22

### OCR Screenshot Support
- Upload images via drag & drop, file picker, or paste button
- Tesseract.js OCR extracts English text from screenshots automatically
- Extracted text automatically appended to the textarea
- Added "Clear" button to reset input
- Retains existing paste-text functionality

## [0.1.0] - 2026-04-22

### Initial Release
- Text area for pasting English articles
- Automatic extraction of new words beyond middle school level
- Word cards with: word, phonetic, part of speech, definition, example sentence
- British pronunciation audio button (Web Speech API)
- Real calendar sidebar to browse saved articles by date
- Save/load articles from local PostgreSQL database (ielts_vocab)
- API routes: `/api/analyze` for word extraction, `/api/articles` for CRUD
- Responsive layout: main content + sidebar
