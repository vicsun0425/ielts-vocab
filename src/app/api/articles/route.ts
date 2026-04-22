import { NextRequest, NextResponse } from 'next/server';
import { saveArticle, getArticlesByDate, deleteArticle } from '@/lib/db';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'Date required' }, { status: 400 });
  }
  const articles = await getArticlesByDate(date);
  return NextResponse.json(articles);
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
