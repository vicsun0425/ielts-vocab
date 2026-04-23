import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
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
  format: 'html' | 'pdf';
  createdAt: string;
}

const SUPPORTED_EXTS = ['.html', '.pdf'];

function getMetaPath(filename: string): string {
  const base = SUPPORTED_EXTS.reduce((f, ext) => f.replace(new RegExp(ext.replace('.', '\\.') + '$'), ''), filename);
  return path.join(EXPORTS_DIR, `${base}.meta.json`);
}

function getExt(filename: string): 'html' | 'pdf' {
  if (filename.endsWith('.pdf')) return 'pdf';
  return 'html';
}

export function listExports(): ExportRecord[] {
  try {
    const files = readdirSync(EXPORTS_DIR).sort().reverse();
    return files
      .filter((f) => SUPPORTED_EXTS.some(ext => f.endsWith(ext)) && !f.endsWith('.meta.json'))
      .map((file) => {
        const metaPath = getMetaPath(file);
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
          title: meta.title || file.replace(/\.(html|pdf)$/, ''),
          wordCount: meta.wordCount || 0,
          withAudio: meta.withAudio ?? false,
          format: getExt(file),
          createdAt: stat.birthtime.toISOString(),
        };
      });
  } catch {
    return [];
  }
}

export function saveExport(
  filename: string,
  content: string | Buffer,
  meta: { title: string; wordCount: number; withAudio: boolean }
): string {
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-.]/g, '_');
  const filepath = path.join(EXPORTS_DIR, safeFilename);
  writeFileSync(filepath, content);
  const base = safeFilename.replace(/\.(html|pdf)$/, '');
  writeFileSync(
    path.join(EXPORTS_DIR, `${base}.meta.json`),
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
    const metaPath = getMetaPath(safeFilename);
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }
    if (existsSync(metaPath)) {
      unlinkSync(metaPath);
    }
    return true;
  } catch {
    return false;
  }
}

export function deleteExportsByTitle(title: string): boolean {
  try {
    const files = readdirSync(EXPORTS_DIR);
    let deleted = false;
    for (const file of files) {
      if (!SUPPORTED_EXTS.some(ext => file.endsWith(ext))) continue;
      const metaPath = getMetaPath(file);
      try {
        if (existsSync(metaPath)) {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          if (meta.title === title) {
            unlinkSync(path.join(EXPORTS_DIR, file));
            unlinkSync(metaPath);
            deleted = true;
          }
        }
      } catch {
        // ignore
      }
    }
    return deleted;
  } catch {
    return false;
  }
}
