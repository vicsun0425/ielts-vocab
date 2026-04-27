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
  [/^(.+)([^aeiou])ied$/, '$1$2y'],      // tried → try
  [/^(.+)ies$/, '$1y'],                  // studies → study
  [/^(.+)([bcdfgklmnprstvz])\2ing$/, '$1$2'], // running → run (double consonant)
  [/^(.+)nned$/, '$1n'],
  [/^(.+)tted$/, '$1t'],
  [/^(.+)ssed$/, '$1ss'],                // passed → pass
  [/^(.+)([^aeiou])\2ed$/, '$1$2'],      // stopped → stop
  [/^(.+)ing$/, '$1'],                   // playing → play
  [/^(.+)ed$/, '$1'],                    // played → play
  [/^(.+)(ss|sh|ch|x|z)es$/, '$1$2'],    // passes → pass, boxes → box
  [/^(.+(?:[cs]|sh|ch|z|o))es$/, '$1'],  // goes → go, heroes → hero
  [/^(.+)s$/, '$1'],                     // plays → play, creatures → creature
];

function getLemma(word: string): string {
  // Check explicit lemma map first
  const mapped = REVERSE_LEMMA.get(word);
  if (mapped) return mapped;

  // Try rule-based lemmatization - return base form even if not known
  for (const [pattern, replacement] of SUFFIX_RULES) {
    const base = word.replace(pattern, replacement);
    if (base !== word && base.length > 1) {
      return base;
    }
  }

  return word;
}

export function extractNewWords(text: string): string[] {
  // Phase 1: Extract words
  const words = text
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .match(/[a-zA-Z']+/g) || [];

  const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/^'+|'+$/g, '')))];

  // Phase 2: Extract phrasal verbs (verb + particle)
  // Only capture particles that create meaningful phrasal verbs
  const PHRASAL_PARTICLES = new Set([
    'out','up','down','off','over','onto','into','across','through',
    'to','from','with','against','about'
  ]);
  const PHRASES: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const curr = words[i].toLowerCase().replace(/^'+|'+$/g, '');
    const next = words[i + 1].toLowerCase().replace(/^'+|'+$/g, '');
    if (curr.length < 3 || !PHRASAL_PARTICLES.has(next)) continue;

    const isVerb = (w: string): boolean => {
      // Regular verb inflections
      if (w.endsWith('ed') || w.endsWith('ing') || w.endsWith('es') || w.endsWith('ies')) return true;
      // -s form: check if base looks like a verb (not a known noun)
      if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
        const base = w.slice(0, -1);
        // If base is in known-words, it's a verb
        if (KNOWN_WORDS.has(base)) return true;
        // If base looks like a verb (not a common noun pattern), treat as verb
        if (base.length >= 3 && !base.endsWith('tion') && !base.endsWith('ment') && !base.endsWith('ness') && !base.endsWith('ity')) return true;
      }
      // Base form: if it's NOT in known-words and not obviously a noun/adjective
      if (w.length >= 3 && !w.endsWith('s') && !w.endsWith('tion') && !w.endsWith('ment') && !w.endsWith('ness') && !w.endsWith('ity')) return true;
      // Check lemma map
      const mapped = REVERSE_LEMMA.get(w);
      if (mapped && KNOWN_WORDS.has(mapped)) return true;
      return false;
    };

    if (!isVerb(curr)) continue;

    const phraseKey = curr + ' ' + next;
    if (!PHRASES.includes(phraseKey)) {
      PHRASES.push(phraseKey);
    }
  }
  const uniquePhrases = [...new Set(PHRASES)];

  // Filter: skip if the word itself, its lemma, or its base form is known
  const newWords = uniqueWords.filter(w => {
    if (!w || w.length < 2) return false;
    if (w.length <= 1) return false;
    if (isKnownWord(w)) return false;
    const lemma = getLemma(w);
    if (lemma !== w && isKnownWord(lemma)) return false;
    return true;
  });

  // Preserve original order
  const order = Object.fromEntries(uniqueWords.map((w, i) => [w, i]));
  newWords.sort((a, b) => (order[a] ?? 0) - (order[b] ?? 0));

  // Normalize inflected forms to their lemma
  const normalized = newWords.map(w => {
    const lemma = getLemma(w);
    // For -s forms: always normalize
    if (w !== lemma && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return lemma;
    // For -ing/-ed forms: normalize only if explicitly in the lemma map
    // (this avoids mangling words like "poaching" → "poach" unless there's an explicit mapping)
    if (w !== lemma && REVERSE_LEMMA.has(w)) return lemma;
    return w;
  });

  // Deduplicate after normalization
  const deduped = [...new Set(normalized)];

  // Remove single words that are part of a phrase
  const singleWords = deduped.filter(w => {
    return !uniquePhrases.some(p => p.startsWith(w + ' '));
  });

  const result = [...singleWords, ...uniquePhrases];
  return result.slice(0, 100);
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
