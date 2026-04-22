import { NextRequest, NextResponse } from 'next/server';
import { extractNewWords, lookupWords, type WordEntry } from '@/lib/dictionary';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  const newWords = extractNewWords(text);
  const wordDetails: WordEntry[] = await lookupWords(newWords);

  return NextResponse.json({ words: wordDetails, count: wordDetails.length });
}
