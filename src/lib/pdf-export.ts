import type { WordEntry } from '@/lib/dictionary';

interface AudioEntry {
  word: string;
  phoneticUk: string;
  definition: string;
  example: string;
  pos: string;
  audioData: string; // base64 data URI
}

export async function generateVocabularyHtml(
  wordList: AudioEntry[]
): Promise<string> {
  let audioScript = `
    function speak(word) {
      const utterance = new SpeechSynthesisUtterance(word);
      const voices = speechSynthesis.getVoices();
      const ukVoice = voices.find(v => v.lang.startsWith('en-GB') || v.lang.startsWith('en-UK'));
      if (ukVoice) utterance.voice = ukVoice;
      utterance.lang = 'en-GB';
      utterance.rate = 0.85;
      speechSynthesis.speak(utterance);
    }
    // Preload voices
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    speechSynthesis.getVoices();
  `;

  const cards = wordList
    .map(
      (w, idx) => `
    <div class="card">
      <div class="card-header">
        <span class="num">${idx + 1}</span>
        <span class="word">${escapeHtml(w.word)}</span>
        ${w.pos ? `<span class="pos">${escapeHtml(w.pos)}</span>` : ''}
        <button class="speak-btn" onclick="speak('${escapeHtml(w.word)}')" title="British pronunciation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"/>
          </svg>
          UK
        </button>
      </div>
      ${w.phoneticUk ? `<div class="phonetic">${escapeHtml(w.phoneticUk)}</div>` : ''}
      <div class="definition">${escapeHtml(w.definition)}</div>
      ${w.example ? `<div class="example">"${escapeHtml(w.example)}"</div>` : ''}
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>IELTS Vocabulary</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #18181b; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #71717a; font-size: 14px; margin-bottom: 20px; }
  .count { font-size: 12px; color: #a1a1aa; margin-bottom: 16px; }
  .card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #e4e4e7; }
  .card-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .num { background: #dbeafe; color: #1d4ed8; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .word { font-size: 18px; font-weight: 700; }
  .pos { font-size: 11px; background: #f4f4f5; color: #71717a; padding: 2px 8px; border-radius: 999px; font-style: italic; }
  .speak-btn { display: inline-flex; align-items: center; gap: 4px; background: #f4f4f5; border: none; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 500; color: #52525b; cursor: pointer; }
  .speak-btn:hover { background: #dbeafe; color: #2563eb; }
  .phonetic { font-family: monospace; color: #71717a; font-size: 13px; margin-top: 4px; }
  .definition { font-size: 14px; color: #3f3f46; margin-top: 8px; line-height: 1.5; }
  .example { font-size: 13px; color: #a1a1aa; font-style: italic; border-left: 2px solid #e4e4e7; padding-left: 12px; margin-top: 8px; }
  @media print {
    body { background: #fff; padding: 0; }
    .speak-btn { display: none !important; }
    .card { break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>IELTS Vocabulary</h1>
<p class="subtitle">Exported from IELTS Vocabulary Tool</p>
<p class="count">${wordList.length} words</p>
${cards}
<script>${audioScript}</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
