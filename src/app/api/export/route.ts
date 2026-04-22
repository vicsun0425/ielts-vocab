import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlWithAudio } from '@/lib/pdf-export';

export async function POST(req: NextRequest) {
  const { words } = await req.json();
  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 });
  }

  const html = await generateHtmlWithAudio(words);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': 'attachment; filename="ielts-vocabulary.html"',
    },
  });
}
