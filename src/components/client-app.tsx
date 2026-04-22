'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CalendarPicker from './calendar';
import WordList from './word-list';
import OcrUpload from './ocr-upload';
import type { WordEntry } from '@/lib/dictionary';

export default function ClientApp({ initialDates }: { initialDates: string[] }) {
  const [text, setText] = useState('');
  const [words, setWords] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calendarDates, setCalendarDates] = useState(initialDates);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [savedArticles, setSavedArticles] = useState<
    { date: string; title: string; id: number; words: WordEntry[] }[]
  >([]);
  const [exportingAudio, setExportingAudio] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/articles?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setSavedArticles(data))
      .catch(() => setSavedArticles([]));
  }, [selectedDate]);

  const handleOcrText = useCallback((extractedText: string) => {
    setText((prev) => {
      if (prev.trim()) return prev + '\n\n' + extractedText;
      return extractedText;
    });
  }, []);

  const handleTextareaPaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng', 1, {
            logger: (m) => {
              if (m.status) console.log(`OCR: ${m.status}`);
            },
          });
          const { data } = await worker.recognize(blob);
          await worker.terminate();
          if (data.text.trim()) {
            setText((prev) =>
              prev.trim() ? prev + '\n\n' + data.text.trim() : data.text.trim()
            );
          }
          return;
        }
      }
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setWords(data.words || []);
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const handleSave = useCallback(async () => {
    if (!text.trim() || words.length === 0) return;
    try {
      await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: text.slice(0, 50).trim() + (text.length > 50 ? '...' : ''),
          content: text,
          words,
          date: selectedDate,
        }),
      });
      setSaved(true);
      setCalendarDates((prev) => {
        if (prev.includes(selectedDate)) return prev;
        return [...prev, selectedDate];
      });
    } catch {
      // save failed
    }
  }, [text, words, selectedDate]);

  const handleExportAll = useCallback(() => {
    window.location.href = '/api/articles?export=html';
  }, []);

  const handleExportWithAudio = useCallback(async () => {
    if (!words.length) return;
    setExportingAudio(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ielts-vocabulary.html';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // export failed
    } finally {
      setExportingAudio(false);
    }
  }, [words]);

  const handleExportArticle = useCallback(async (id: number, title: string) => {
    const res = await fetch(`/api/articles?export=html&audio=true&id=${id}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'vocabulary').replace(/[^a-zA-Z0-9_一-鿿]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      await fetch(`/api/articles?id=${id}`, { method: 'DELETE' });
      setSavedArticles((prev) => prev.filter((a) => a.id !== id));
    },
    [setSavedArticles]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            IELTS Vocabulary Tool
          </h1>
          <p className="text-zinc-500 mt-1">
            Paste text or upload a screenshot — extract new words with phonetics, definitions, and audio.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input area */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <OcrUpload onTextExtracted={handleOcrText} />

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-xs text-zinc-400">or paste text</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              <textarea
                ref={textareaRef}
                className="w-full h-64 p-4 border border-zinc-200 rounded-xl text-zinc-800 text-sm
                  placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent font-normal leading-relaxed"
                placeholder="Paste any English article or passage here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handleTextareaPaste}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-zinc-400">
                  {text.trim().length > 0
                    ? `${text.trim().split(/\s+/).length} words`
                    : 'Enter text to analyze'}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {text.trim().length > 0 && (
                    <button
                      onClick={() => setText('')}
                      className="px-3 py-2 text-zinc-500 hover:text-zinc-700 text-sm transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  {words.length > 0 && !saved && (
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                  )}
                  {saved && (
                    <span className="px-4 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
                      Saved!
                    </span>
                  )}
                  {words.length > 0 && (
                    <>
                      <button
                        onClick={handleExportAll}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Export (Web)
                      </button>
                      <button
                        onClick={handleExportWithAudio}
                        disabled={exportingAudio}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-300 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {exportingAudio ? 'Generating...' : 'Export (Audio)'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !text.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300
                      text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </div>
            </div>

            {/* Saved articles for this date */}
            {savedArticles.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-zinc-700 mb-3">
                  Saved articles on {selectedDate}
                </h3>
                <div className="space-y-3">
                  {savedArticles.map((article) => (
                    <div
                      key={article.id}
                      className="p-4 bg-zinc-50 rounded-xl border border-zinc-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-800 truncate flex-1">
                          {article.title || 'Untitled'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleExportArticle(article.id, article.title)}
                            className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded-lg transition-colors"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <WordList words={article.words} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Word list */}
            {words.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-zinc-800">
                    New Words Found ({words.length})
                  </h2>
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">
                    Middle school level filter
                  </span>
                </div>
                <WordList words={words} />
              </div>
            )}

            {!loading && words.length === 0 && text.length > 0 && (
              <div className="text-center py-12 text-zinc-400">
                Click &quot;Analyze&quot; to find new words
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CalendarPicker
              dates={calendarDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-zinc-700 mb-2">
                How it works
              </h3>
              <ol className="text-xs text-zinc-500 space-y-1.5 list-decimal list-inside">
                <li>Upload a screenshot or paste text</li>
                <li>OCR extracts text from images automatically</li>
                <li>Click &ldquo;Analyze&rdquo;</li>
                <li>See new words beyond middle school level</li>
                <li>Click the speaker icon to hear British pronunciation</li>
                <li>Save articles to review by date</li>
                <li>Export as HTML (with or without embedded audio)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
