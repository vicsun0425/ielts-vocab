import { NextRequest, NextResponse } from 'next/server';
import { saveArticle, getArticlesByDate, deleteArticle, getAllDates } from '@/lib/db';
import { generateVocabularyHtml } from '@/lib/pdf-export';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const exportHtml = req.nextUrl.searchParams.get('export');

  if (exportHtml === 'html') {
    // Export all words across all dates as HTML
    const dates = await getAllDates();
    const allWords = new Map<string, { word: string; phoneticUk: string; definition: string; example: string; pos: string }>();

    for (const d of dates) {
      const articles = await getArticlesByDate(d);
      for (const article of articles) {
        const words = typeof article.words === 'string' ? JSON.parse(article.words) : (article.words as any[]);
        for (const w of words) {
          if (!allWords.has(w.word)) {
            allWords.set(w.word, {
              word: w.word,
              phoneticUk: w.phoneticUk || w.phonetic || '',
              definition: w.definition || '',
              example: w.example || '',
              pos: w.pos || '',
            });
          }
        }
      }
    }

    const wordList = Array.from(allWords.values());

    const html = generateVocabularyHtml(wordList);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'attachment; filename="ielts-vocabulary.html"',
      },
    });
  }

  if (!date) {
    return NextResponse.json({ error: 'Date required' }, { status: 400 });
  }
  const articles = await getArticlesByDate(date);
  const parsed = articles.map((a) => ({
    ...a,
    words: typeof a.words === 'string' ? JSON.parse(a.words) : (a.words as object[]),
  }));
  return NextResponse.json(parsed);
}

export async function POST(req: NextRequest) {
  const { title, content, words } = await req.json();
  if (!content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }
  const article = await saveArticle(title || '', content, words || []);
  if (!article) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  return NextResponse.json(article);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }
  const ok = await deleteArticle(Number(id));
  return NextResponse.json({ ok });
}
