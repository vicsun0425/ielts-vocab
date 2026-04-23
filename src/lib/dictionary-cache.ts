import fs from 'fs';
import path from 'path';
import type { WordEntry } from './dictionary';

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'dictionary-cache.json');

interface CacheEntry {
  phonetic: string;
  phoneticUk: string;
  definition: string;
  definitionZh: string;
  example: string;
  pos: string;
  cachedAt: number;
}

let cache: Map<string, CacheEntry> | null = null;

function loadCache(): Map<string, CacheEntry> {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    cache = new Map(Object.entries(data.entries || {}));
  } catch {
    cache = new Map();
  }
  return cache;
}

export function getCachedWord(word: string): WordEntry | null {
  const entry = loadCache().get(word.toLowerCase());
  if (!entry) return null;
  return {
    word,
    phonetic: entry.phonetic,
    phoneticUk: entry.phoneticUk,
    definition: entry.definition,
    definitionZh: entry.definitionZh,
    example: entry.example,
    pos: entry.pos,
  };
}

export function setCachedWord(word: string, entry: WordEntry): void {
  loadCache().set(word.toLowerCase(), {
    phonetic: entry.phonetic,
    phoneticUk: entry.phoneticUk,
    definition: entry.definition,
    definitionZh: entry.definitionZh,
    example: entry.example,
    pos: entry.pos,
    cachedAt: Date.now(),
  });
}

export function flushCache(): void {
  const c = loadCache();
  const data = { version: 1, entries: Object.fromEntries(c) };
  const tmp = CACHE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, CACHE_PATH);
}
