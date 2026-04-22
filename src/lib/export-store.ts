import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const EXPORTS_DIR = path.join(process.cwd(), 'exports');

if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

export interface ExportRecord {
  id: string;
  filename: string;
  title: string;
  wordCount: number;
  withAudio: boolean;
  createdAt: string;
}

export function listExports(): ExportRecord[] {
  try {
    const { statSync } = require('fs');
    const files = readdirSync(EXPORTS_DIR).sort().reverse();
    return files
      .filter((f) => f.endsWith('.html'))
      .map((file) => {
        const metaPath = path.join(EXPORTS_DIR, file.replace('.html', '.meta.json'));
        let meta: Partial<ExportRecord> = {};
        try {
          if (existsSync(metaPath)) {
            meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          }
        } catch {
          // ignore
        }
        const stat = statSync(path.join(EXPORTS_DIR, file));
        return {
          id: file,
          filename: file,
          title: meta.title || file.replace('.html', ''),
          wordCount: meta.wordCount || 0,
          withAudio: meta.withAudio ?? false,
          createdAt: stat.birthtime.toISOString(),
        };
      });
  } catch {
    return [];
  }
}

export function saveExport(
  filename: string,
  html: string,
  meta: { title: string; wordCount: number; withAudio: boolean }
): string {
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-.]/g, '_');
  const filepath = path.join(EXPORTS_DIR, safeFilename);
  writeFileSync(filepath, html);
  writeFileSync(
    path.join(EXPORTS_DIR, safeFilename.replace('.html', '.meta.json')),
    JSON.stringify(meta, null, 2)
  );
  return safeFilename;
}

export function getExportFile(filename: string): Buffer | null {
  try {
    const safeFilename = path.basename(filename);
    const filepath = path.join(EXPORTS_DIR, safeFilename);
    if (!existsSync(filepath)) return null;
    return readFileSync(filepath);
  } catch {
    return null;
  }
}

export function deleteExport(filename: string): boolean {
  try {
    const safeFilename = path.basename(filename);
    const filepath = path.join(EXPORTS_DIR, safeFilename);
    const metaPath = filepath.replace('.html', '.meta.json');
    if (existsSync(filepath)) {
      require('fs').unlinkSync(filepath);
    }
    if (existsSync(metaPath)) {
      require('fs').unlinkSync(metaPath);
    }
    return true;
  } catch {
    return false;
  }
}
