import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnv() {
  const envFiles = [
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env')
  ];

  for (const filePath of envFiles) {
    if (existsSync(filePath)) {
      parseEnvFile(filePath);
    }
  }
}

function parseEnvFile(filePath) {
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
