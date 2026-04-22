import { KNOWN_WORDS } from './known-words';

export interface WordEntry {
  word: string;
  phonetic: string;
  phoneticUk: string;
  definition: string;
  example: string;
  pos: string; // part of speech
}

function isKnownWord(word: string): boolean {
  return KNOWN_WORDS.has(word.toLowerCase());
}

export function extractNewWords(text: string): string[] {
  const words = text
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .match(/[a-zA-Z']+/g) || [];

  const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/^'+|'+$/g, '')))];
  const newWords = uniqueWords.filter(w => w.length > 0 && !isKnownWord(w));

  const order = Object.fromEntries(uniqueWords.map((w, i) => [w, i]));
  newWords.sort((a, b) => (order[a] ?? 0) - (order[b] ?? 0));

  return newWords.slice(0, 50);
}

export async function lookupWord(word: string): Promise<WordEntry | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[0];

    let phoneticUk = '';
    let phonetic = '';
    for (const ph of entry.phonetics || []) {
      if (ph.audio?.includes('-uk') || ph.audio?.includes('en-uk') || ph.audio?.includes('british')) {
        phoneticUk = ph.text || '';
      }
      if (!phonetic && ph.text) {
        phonetic = ph.text;
      }
    }
    if (!phoneticUk) phoneticUk = phonetic;

    let definition = '';
    let example = '';
    let pos = '';

    for (const meaning of entry.meanings || []) {
      pos = meaning.partOfSpeech || '';
      for (const def of meaning.definitions || []) {
        if (def.definition) {
          definition = def.definition;
          example = def.example || '';
          break;
        }
      }
      if (definition) break;
    }

    if (!definition) return null;

    return {
      word: entry.word,
      phonetic,
      phoneticUk,
      definition,
      example,
      pos,
    };
  } catch {
    return null;
  }
}

export async function lookupWords(words: string[]): Promise<WordEntry[]> {
  const results: WordEntry[] = [];
  const batchSize = 5;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const lookups = await Promise.all(batch.map(w => lookupWord(w)));
    for (const entry of lookups) {
      if (entry) results.push(entry);
    }
  }

  return results;
}
