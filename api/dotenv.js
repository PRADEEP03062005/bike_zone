import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("([^"]*)"|'([^']*)'|(.*))\s*$/);
    if (!match) continue;
    const key = match[1];
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
