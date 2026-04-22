import { NextRequest, NextResponse } from 'next/server';
import { saveArticle, getArticlesByDate, deleteArticle, getAllDates } from '@/lib/db';
import { generateVocabularyHtml, generateHtmlWithAudio } from '@/lib/pdf-export';

interface WordData {
  word: string;
  phoneticUk: string;
  definition: string;
  definitionZh: string;
  example: string;
  pos: string;
}

function extractWordData(words: unknown): WordData[] {
  const arr = Array.isArray(words) ? words : (typeof words === 'string' ? JSON.parse(words) : []);
  return arr.map((w: Record<string, string>) => ({
    word: w.word || '',
    phoneticUk: w.phoneticUk || w.phonetic || '',
    definition: w.definition || '',
    definitionZh: w.definitionZh || '',
    example: w.example || '',
    pos: w.pos || '',
  }));
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const exportHtml = req.nextUrl.searchParams.get('export');
  const articleId = req.nextUrl.searchParams.get('id');
  const withAudio = req.nextUrl.searchParams.get('audio');

  // Export a single article by ID
  if (articleId) {
    const dates = await getAllDates();
    for (const d of dates) {
      const articles = await getArticlesByDate(d);
      for (const article of articles) {
        if (article.id === Number(articleId)) {
          const words = extractWordData(article.words);
          if (withAudio === 'true') {
            // Generate HTML with embedded audio (single file, offline)
            const html = await generateHtmlWithAudio(words as any);
            return new NextResponse(html, {
              headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(article.title || 'vocabulary')}.html"`,
              },
            });
          }
          const html = generateVocabularyHtml(words);
          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(article.title || 'vocabulary')}.html"`,
            },
          });
        }
      }
    }
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Export all words
  if (exportHtml === 'html') {
    const dates = await getAllDates();
    const wordMap = new Map<string, WordData>();

    for (const d of dates) {
      const articles = await getArticlesByDate(d);
      for (const article of articles) {
        for (const w of extractWordData(article.words)) {
          if (!wordMap.has(w.word)) {
            wordMap.set(w.word, w);
          }
        }
      }
    }

    const words = Array.from(wordMap.values());
    if (withAudio === 'true') {
      const html = await generateHtmlWithAudio(words as any);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'attachment; filename="ielts-vocabulary.html"',
        },
      });
    }

    const html = generateVocabularyHtml(words);
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
