import { neon } from '@neondatabase/serverless';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function initDb() {
  const sql = getDb();
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      words JSONB NOT NULL DEFAULT '[]',
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

export interface ArticleRecord {
  id: number;
  title: string;
  content: string;
  words: object[];
  date: string;
  created_at: string;
}

export async function saveArticle(
  title: string,
  content: string,
  words: object[]
): Promise<ArticleRecord | null> {
  const sql = getDb();
  if (!sql) return null;
  await initDb();
  const rows = await sql`
    INSERT INTO articles (title, content, words, date)
    VALUES (${title}, ${content}, ${JSON.stringify(words)}, CURRENT_DATE)
    RETURNING *
  `;
  return rows[0] as ArticleRecord;
}

export async function getArticlesByDate(date: string): Promise<ArticleRecord[]> {
  const sql = getDb();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM articles WHERE date = ${date} ORDER BY created_at DESC
  `;
  return rows as ArticleRecord[];
}

export async function getAllDates(): Promise<string[]> {
  const sql = getDb();
  if (!sql) return [];
  const rows = await sql`
    SELECT DISTINCT date FROM articles ORDER BY date DESC
  `;
  return rows.map((r: { date: string }) =>
    new Date(r.date).toISOString().split('T')[0]
  );
}

export async function deleteArticle(id: number): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`DELETE FROM articles WHERE id = ${id}`;
  return rows.length > 0;
}
