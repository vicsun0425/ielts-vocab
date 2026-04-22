'use client';

import { useState } from 'react';
import type { WordEntry } from '@/lib/dictionary';

export default function WordList({ words, onExport }: { words: WordEntry[]; onExport?: () => void }) {
  return (
    <div className="space-y-3">
      {words.map((entry, idx) => (
        <WordCard key={`${entry.word}-${idx}`} entry={entry} index={idx} />
      ))}
      {onExport && (
        <button
          onClick={onExport}
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Export this article as HTML
        </button>
      )}
    </div>
  );
}

function WordCard({ entry, index }: { entry: WordEntry; index: number }) {
  const [playing, setPlaying] = useState(false);

  const playAudio = () => {
    setPlaying(true);
    const utterance = new SpeechSynthesisUtterance(entry.word);
    const voices = speechSynthesis.getVoices();
    const ukVoice = voices.find((v) =>
      v.lang.startsWith('en-GB') || v.lang.startsWith('en-UK')
    );
    if (ukVoice) {
      utterance.voice = ukVoice;
    }
    utterance.lang = 'en-GB';
    utterance.rate = 0.85;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    speechSynthesis.speak(utterance);
  };

  if (typeof window !== 'undefined' && speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-zinc-900">{entry.word}</span>
            {entry.pos && (
              <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full italic">
                {entry.pos}
              </span>
            )}
            <button
              onClick={playAudio}
              disabled={playing}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                ${playing
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-zinc-100 hover:bg-blue-100 text-zinc-600 hover:text-blue-600'
                }`}
              title="British pronunciation"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"
                />
              </svg>
              <span className="hidden sm:inline">UK</span>
            </button>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm">
            {entry.phoneticUk && (
              <span className="text-zinc-500 font-mono">{entry.phoneticUk}</span>
            )}
          </div>
          <p className="mt-2 text-sm text-zinc-700 leading-relaxed">
            {entry.definition}
          </p>
          {entry.definitionZh && (
            <p className="mt-1 text-sm text-blue-700 leading-relaxed">
              {entry.definitionZh}
            </p>
          )}
          {entry.example && (
            <p className="mt-2 text-sm text-zinc-500 italic border-l-2 border-zinc-200 pl-3">
              "{entry.example}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
