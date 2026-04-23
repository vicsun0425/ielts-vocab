#!/usr/bin/env python3
"""Clean up known-words.ts: deduplicate, sort, and reformat."""
import re
import os

TS_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'known-words.ts')

with open(TS_PATH) as f:
    content = f.read()

# Extract all quoted strings
words = re.findall(r'"([^"]+)"', content)

# Normalize and deduplicate
unique = sorted(set(w.lower().strip() for w in words if w.strip()))

# Write back as clean TS
lines = [
    '// Common words that a middle school student (初中) should know',
    '// Words NOT in this list will be treated as "new words"',
    f'// {len(unique)} unique words (auto-deduplicated)',
    'export const KNOWN_WORDS = new Set([',
]

# Write in groups of 15 per line
for i in range(0, len(unique), 15):
    chunk = unique[i:i+15]
    lines.append('  ' + ','.join(f'"{w}"' for w in chunk) + ',')

lines.append(']);')

with open(TS_PATH, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f'Cleaned: {len(words)} entries → {len(unique)} unique words')
