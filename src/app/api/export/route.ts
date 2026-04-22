import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlWithAudio, generateVocabularyHtml } from '@/lib/pdf-export';
import { saveExport, listExports, getExportFile } from '@/lib/export-store';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const download = req.nextUrl.searchParams.get('download');
  const list = req.nextUrl.searchParams.get('list');

  // List all saved exports
  if (list === 'true') {
    const exports = listExports();
    return NextResponse.json(exports);
  }

  // Download a specific saved export
  if (download === 'true' && id) {
    const buffer = getExportFile(id);
    if (!buffer) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const filename = id.endsWith('.html') ? id : `${id}.html`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { words, title, withAudio } = await req.json();
  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 });
  }

  const timestamp = Date.now();
  const filename = `vocabulary-${timestamp}.html`;
  const safeTitle = title || `vocabulary-${timestamp}`;

  let html: string;
  if (withAudio) {
    html = await generateHtmlWithAudio(words);
  } else {
    html = generateVocabularyHtml(words);
  }

  const savedFilename = saveExport(filename, html, {
    title: safeTitle,
    wordCount: words.length,
    withAudio: !!withAudio,
  });

  return NextResponse.json({
    id: savedFilename,
    filename: savedFilename,
    wordCount: words.length,
    withAudio: !!withAudio,
  });
}
