import type { WordEntry } from '@/lib/dictionary';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface ZipWordData {
  word: string;
  phoneticUk: string;
  definition: string;
  definitionZh: string;
  example: string;
  pos: string;
  audioData?: string; // base64 m4a data URI
}

export function generateVocabularyHtml(wordList: ZipWordData[]): string {
  const cards = wordList
    .map(
      (w, idx) => `
    <div class="card">
      <div class="card-header">
        <span class="num">${idx + 1}</span>
        <span class="word">${escapeHtml(w.word)}</span>
        ${w.pos ? `<span class="pos">${escapeHtml(w.pos)}</span>` : ''}
        ${w.audioData
          ? `<button class="speak-btn" onclick="playAudio('${w.audioData}', this)" title="British pronunciation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"/>
              </svg>
              UK
            </button>`
          : ''}
      </div>
      ${w.phoneticUk ? `<div class="phonetic">${escapeHtml(w.phoneticUk)}</div>` : ''}
      <div class="definition">${escapeHtml(w.definition)}</div>
      ${w.definitionZh ? `<div class="definition-zh">${escapeHtml(w.definitionZh)}</div>` : ''}
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
  .speak-btn.playing { background: #dbeafe; color: #2563eb; }
  .phonetic { font-family: monospace; color: #71717a; font-size: 13px; margin-top: 4px; }
  .definition { font-size: 14px; color: #3f3f46; margin-top: 8px; line-height: 1.5; }
  .definition-zh { font-size: 14px; color: #2563eb; margin-top: 4px; line-height: 1.5; }
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
<script>
const activeAudios = [];
function playAudio(dataUri, btn) {
  activeAudios.forEach(a => { a.pause(); });
  activeAudios.length = 0;
  btn.classList.add('playing');
  const audio = new Audio(dataUri);
  activeAudios.push(audio);
  audio.onended = () => btn.classList.remove('playing');
  audio.onerror = () => btn.classList.remove('playing');
  audio.play().catch(() => btn.classList.remove('playing'));
}
</script>
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

const execAsync = promisify(exec);

const AUDIO_CONCURRENCY = 3;

async function generateWordAudio(word: string, tmpDir: string): Promise<string | undefined> {
  const safeName = word.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tmpFile = path.join(tmpDir, `${safeName}.m4a`);
  try {
    await execAsync(`say -v Daniel -o "${tmpFile}" "${word.replace(/"/g, '\\"')}"`, { timeout: 10000 });
    const buffer = fs.readFileSync(tmpFile);
    const dataUri = `data:audio/mp4;base64,${buffer.toString('base64')}`;
    fs.unlinkSync(tmpFile);
    return dataUri;
  } catch {
    return undefined;
  }
}

export async function generateHtmlWithAudio(wordList: WordEntry[]): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ielts-audio-'));
  const htmlWords: ZipWordData[] = [];

  // Process words in concurrency-limited batches
  for (let i = 0; i < wordList.length; i += AUDIO_CONCURRENCY) {
    const batch = wordList.slice(i, i + AUDIO_CONCURRENCY);
    const results = await Promise.all(
      batch.map((w) => generateWordAudio(w.word, tmpDir))
    );
    for (let j = 0; j < batch.length; j++) {
      const w = batch[j];
      htmlWords.push({
        word: w.word,
        phoneticUk: w.phoneticUk || w.phonetic || '',
        definition: w.definition,
        definitionZh: (w as any).definitionZh || '',
        example: w.example || '',
        pos: w.pos || '',
        audioData: results[j],
      });
    }
  }

  // Clean up tmp dir
  try { fs.rmdirSync(tmpDir); } catch {}

  return generateVocabularyHtml(htmlWords);
}

// --- PDF Export with Embedded Audio ---

import { spawn } from 'child_process';

async function generateWordAudioFile(word: string, outputPath: string): Promise<void> {
  await execAsync(`say -v Daniel -o "${outputPath}" "${word.replace(/"/g, '\\"')}"`, { timeout: 10000 });
}

export async function generatePdfWithAudio(wordList: WordEntry[]): Promise<Buffer> {
  if (process.platform !== 'darwin') {
    throw new Error('PDF export with audio requires macOS (say command). Use HTML export instead.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ielts-pdf-'));
  const audioFiles: { word: string; file: string }[] = [];

  // Generate audio files for each word (concurrency limited)
  for (let i = 0; i < wordList.length; i += AUDIO_CONCURRENCY) {
    const batch = wordList.slice(i, i + AUDIO_CONCURRENCY);
    await Promise.all(
      batch.map(async (w) => {
        const safeName = w.word.replace(/[^a-zA-Z0-9_-]/g, '_');
        const audioFile = path.join(tmpDir, `${safeName}.m4a`);
        try {
          await generateWordAudioFile(w.word, audioFile);
          audioFiles.push({ word: w.word, file: audioFile });
        } catch {
          // Skip failed audio
        }
      })
    );
  }

  // Build audio lookup
  const audioMap = new Map(audioFiles.map(a => [a.word, a.file]));

  // Build input for Python script
  const inputData = {
    words: wordList.map((w) => ({
      word: w.word,
      phonetic: w.phonetic || w.phoneticUk || '',
      phoneticUk: w.phoneticUk || w.phonetic || '',
      definition: w.definition,
      definitionZh: (w as any).definitionZh || '',
      example: w.example || '',
      pos: w.pos || '',
      audioFile: audioMap.get(w.word) || '',
    })),
    title: 'IELTS Vocabulary',
  };

  // Call Python script
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const pyPath = path.join(process.cwd(), 'scripts', 'generate-pdf.py');
    const py = spawn('python3', [pyPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = Buffer.alloc(0);
    let stderr = '';

    py.stdout.on('data', (chunk: Buffer) => { stdout = Buffer.concat([stdout, chunk]); });
    py.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    py.on('error', reject);
    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`generate-pdf.py exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    py.stdin.write(JSON.stringify(inputData));
    py.stdin.end();
  });

  // Clean up
  try {
    for (const af of audioFiles) {
      fs.unlinkSync(af.file);
    }
    fs.rmdirSync(tmpDir);
  } catch {}

  return pdfBuffer;
}
