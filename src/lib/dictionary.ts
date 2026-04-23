import { KNOWN_WORDS } from './known-words';
import LEMMA_MAP from './lemma-map.json';
import { getCachedWord, setCachedWord, flushCache } from './dictionary-cache';

export interface WordEntry {
  word: string;
  phonetic: string;
  phoneticUk: string;
  definition: string;
  definitionZh: string;
  example: string;
  pos: string;
}

function isKnownWord(word: string): boolean {
  return KNOWN_WORDS.has(word.toLowerCase());
}

// Build reverse map: inflected form → lemma
const REVERSE_LEMMA = new Map<string, string>();
for (const [lemma, forms] of Object.entries(LEMMA_MAP)) {
  for (const form of forms) {
    REVERSE_LEMMA.set(form.toLowerCase(), lemma);
  }
}

// Rule-based lemmatizer suffixes (ordered by specificity)
const SUFFIX_RULES: [RegExp, string][] = [
  [/^(.+)ies$/, '$1y'],      // studies → study, tries → try
  [/^(.+)(sses|ches|shes|xes)$/, '$1$2'], // passes → pass (keep base)
  [/^(.+)(ss|sh|ch|x|o)es$/, '$1$2'],
  [/^(.+)es$/, '$1'],         // goes → go (fallback)
  [/^(.+)ies$/, '$1y'],
  [/^(.+)(ss|sh|ch|x|z)es$/, '$1$2'],
  [/^(.+)s$/, '$1'],          // plays → play
  [/^(.+)ied$/, '$1y'],      // tried → try
  [/^(.+)ied$/, '$1y'],
  [/^(.+)([^aeiou])ied$/, '$1$2y'],
  [/^(.+)([^aeiou])yed$/, '$1$2y'],
  [/^(.+)ting$/, '$1t'],      // sitting → sit (double consonant)
  [/^(.+)([bcdfgklmnprstvz])\2ing$/, '$1$2'], // running → run
  [/^(.+)ning$/, '$1n'],      // running → run
  [/^(.+)ring$/, '$1r'],
  [/^(.+)bing$/, '$1b'],
  [/^(.+)ding$/, '$1d'],
  [/^(.+)ging$/, '$1g'],
  [/^(.+)king$/, '$1k'],
  [/^(.+)ping$/, '$1p'],
  [/^(.+)sing$/, '$1s'],
  [/^(.+)ting$/, '$1t'],
  [/^(.+)wing$/, '$1w'],
  [/^(.+)ying$/, '$1y'],
  [/^(.+)ing$/, '$1'],        // playing → play (fallback)
  [/^(.+)nned$/, '$1n'],
  [/^(.+)([bcdfgklmnprstvz])\2ed$/, '$1$2'],  // stopped → stop
  [/^(.+)ied$/, '$1y'],
  [/^(.+)ed$/, '$1'],         // played → play (fallback)
];

function getLemma(word: string): string {
  // Check explicit lemma map first
  const mapped = REVERSE_LEMMA.get(word);
  if (mapped) return mapped;

  // Try rule-based lemmatization
  for (const [pattern, replacement] of SUFFIX_RULES) {
    const base = word.replace(pattern, replacement);
    if (base !== word && base.length > 1 && isKnownWord(base)) {
      return base;
    }
  }

  return word;
}

export function extractNewWords(text: string): string[] {
  const words = text
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .match(/[a-zA-Z']+/g) || [];

  const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/^'+|'+$/g, '')))];

  // Filter: skip if the word itself, its lemma, or its base form is known
  const newWords = uniqueWords.filter(w => {
    if (!w || w.length === 0) return false;
    // Direct match
    if (isKnownWord(w)) return false;
    // Lemma match
    const lemma = getLemma(w);
    if (lemma !== w && isKnownWord(lemma)) return false;
    return true;
  });

  // Preserve original order
  const order = Object.fromEntries(uniqueWords.map((w, i) => [w, i]));
  newWords.sort((a, b) => (order[a] ?? 0) - (order[b] ?? 0));

  return newWords.slice(0, 50);
}

async function translateToChinese(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.responseData?.translatedText || '';
  } catch {
    return '';
  }
}

export async function lookupWord(word: string): Promise<WordEntry | null> {
  const key = word.toLowerCase();

  // Check cache first
  const cached = getCachedWord(key);
  if (cached) return cached;

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
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

    // First pass: find a definition that has an example
    for (const meaning of entry.meanings || []) {
      for (const def of meaning.definitions || []) {
        if (def.definition && def.example) {
          definition = def.definition;
          example = def.example;
          pos = meaning.partOfSpeech || '';
          break;
        }
      }
      if (definition && example) break;
    }

    // Second pass: if no example found, just take any definition
    if (!definition) {
      for (const meaning of entry.meanings || []) {
        for (const def of meaning.definitions || []) {
          if (def.definition) {
            definition = def.definition;
            example = def.example || '';
            pos = meaning.partOfSpeech || '';
            break;
          }
        }
        if (definition) break;
      }
    }

    if (!definition) return null;

    // Translate definition to Chinese
    const definitionZh = await translateToChinese(definition);

    const result: WordEntry = {
      word: entry.word,
      phonetic,
      phoneticUk,
      definition,
      definitionZh,
      example,
      pos,
    };

    // Cache the result
    setCachedWord(key, result);

    return result;
  } catch {
    return null;
  }
}

export async function lookupWords(words: string[]): Promise<WordEntry[]> {
  const results: WordEntry[] = [];
  const batchSize = 3;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const lookups = await Promise.all(batch.map(w => lookupWord(w)));
    for (const entry of lookups) {
      if (entry) results.push(entry);
    }
  }

  // Persist cache to disk
  flushCache();

  return results;
}
