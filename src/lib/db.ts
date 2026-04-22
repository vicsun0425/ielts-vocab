import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (!sql) {
    sql = postgres({
      host: '/tmp',
      database: 'ielts_vocab',
      user: 'victorsun',
      max: 5,
    });
  }
  return sql;
}

export async function initDb() {
  const sql = getDb();
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
  words: string | object[];
  date: Date;
  created_at: Date;
}

export function parseWords(words: ArticleRecord['words']): object[] {
  return typeof words === 'string' ? JSON.parse(words) : (words as object[]);
}

export async function saveArticle(
  title: string,
  content: string,
  words: object[]
): Promise<ArticleRecord | null> {
  const sql = getDb();
  await initDb();
  const rows = await sql<ArticleRecord[]>`
    INSERT INTO articles (title, content, words, date)
    VALUES (${title}, ${content}, ${JSON.stringify(words)}::jsonb, CURRENT_DATE)
    RETURNING *
  `;
  return rows[0];
}

export async function getArticlesByDate(date: string): Promise<ArticleRecord[]> {
  const sql = getDb();
  await initDb();
  const rows = await sql<ArticleRecord[]>`
    SELECT * FROM articles WHERE date = ${date} ORDER BY created_at DESC
  `;
  return rows.map((r) => ({ ...r, words: parseWords(r.words) }));
}

export async function getAllDates(): Promise<string[]> {
  const sql = getDb();
  await initDb();
  const rows = await sql<{ date: Date }[]>`
    SELECT DISTINCT date FROM articles ORDER BY date DESC
  `;
  return rows.map((r) =>
    new Date(r.date).toISOString().split('T')[0]
  );
}

export async function deleteArticle(id: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`DELETE FROM articles WHERE id = ${id}`;
  return rows.length > 0;
}
