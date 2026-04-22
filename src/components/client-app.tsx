'use client';

import { useState, useEffect, useCallback } from 'react';
import CalendarPicker from './calendar';
import WordList from './word-list';
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
    { date: string; title: string; words: WordEntry[] }[]
  >([]);

  // When date changes, load saved articles
  useEffect(() => {
    fetch(`/api/articles?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setSavedArticles(data))
      .catch(() => setSavedArticles([]));
  }, [selectedDate]);

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

  const handleDelete = useCallback(
    async (id: number) => {
      await fetch(`/api/articles?id=${id}`, { method: 'DELETE' });
      setSavedArticles((prev) => prev.filter((a) => (a as any).id !== id));
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
            Paste an article below, and get new words with phonetics, definitions, and audio.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input area */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Paste your English article here
              </label>
              <textarea
                className="w-full h-64 p-4 border border-zinc-200 rounded-xl text-zinc-800 text-sm
                  placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent font-normal leading-relaxed"
                placeholder="Paste any English article or passage here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-zinc-400">
                  {text.trim().length > 0
                    ? `${text.trim().split(/\s+/).length} words`
                    : 'Enter text to analyze'}
                </span>
                <div className="flex gap-2">
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
                  {savedArticles.map((article, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-zinc-50 rounded-xl border border-zinc-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-800 truncate flex-1">
                          {(article as any).title || 'Untitled'}
                        </span>
                        <button
                          onClick={() => handleDelete((article as any).id)}
                          className="text-xs text-red-400 hover:text-red-600 ml-2"
                        >
                          Delete
                        </button>
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
                Click "Analyze" to find new words
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
                <li>Paste an English article</li>
                <li>Click &ldquo;Analyze&rdquo;</li>
                <li>See new words beyond middle school level</li>
                <li>Click the speaker icon to hear British pronunciation</li>
                <li>Save articles to review by date</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
