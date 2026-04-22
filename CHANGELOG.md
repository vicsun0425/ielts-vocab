# Changelog

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
