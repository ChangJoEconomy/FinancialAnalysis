import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function getDataCacheRoot() {
  const configuredRoot = process.env.DATA_CACHE_ROOT || './data-cache';
  return resolve(projectRoot, configuredRoot);
}

export function resolveCachePath(...segments) {
  const cacheRoot = getDataCacheRoot();
  const filePath = resolve(cacheRoot, ...segments);
  const relativePath = relative(cacheRoot, filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Cache path must stay inside DATA_CACHE_ROOT.');
  }

  return filePath;
}

export function writeJsonCacheFile(filePath, data) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return getCacheFileInfo(filePath);
}

export function readJsonCacheFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function cacheFileExists(filePath) {
  return existsSync(filePath);
}

export function isCacheFileFresh(filePath, maxAgeMs, now = new Date()) {
  if (!existsSync(filePath)) {
    return false;
  }

  const stats = statSync(filePath);
  return now.getTime() - stats.mtimeMs <= maxAgeMs;
}

export function getCacheFileInfo(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Cache file does not exist: ${filePath}`);
  }

  const buffer = readFileSync(filePath);
  const stats = statSync(filePath);

  return {
    filePath,
    byteSize: stats.size,
    contentHash: createHash('sha256').update(buffer).digest('hex')
  };
}

export function toProjectRelativePath(filePath) {
  return relative(projectRoot, filePath).replaceAll('\\', '/');
}
