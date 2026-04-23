import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlWithAudio, generateVocabularyHtml, generatePdfWithAudio } from '@/lib/pdf-export';
import { saveExport, listExports, getExportFile, deleteExportsByTitle } from '@/lib/export-store';

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
    const isPdf = id.endsWith('.pdf');
    const filename = id.endsWith('.html') || isPdf ? id : `${id}.html`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': isPdf ? 'application/pdf' : 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { words, title, withAudio, format } = await req.json();
  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 });
  }

  const safeTitle = title || `vocabulary-${Date.now()}`;

  // Delete old exports with same title (dedup by article)
  deleteExportsByTitle(safeTitle);

  const timestamp = Date.now();
  const ext = format === 'pdf' ? 'pdf' : 'html';
  const filename = `${safeTitle.replace(/[^a-zA-Z0-9_一-鿿-]/g, '_')}-${timestamp}.${ext}`;

  if (format === 'pdf') {
    try {
      const pdf = await generatePdfWithAudio(words);
      const savedFilename = saveExport(filename, pdf, {
        title: safeTitle,
        wordCount: words.length,
        withAudio: true,
      });
      return NextResponse.json({
        id: savedFilename,
        filename: savedFilename,
        wordCount: words.length,
        withAudio: true,
        format: 'pdf',
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'PDF generation failed' },
        { status: 501 }
      );
    }
  }

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
    format: 'html',
  });
}
