import path from 'node:path';
import fsSync from 'node:fs';
import { listDirectoryImpl, validatePathImpl } from './validate.js';

export function buildAndValidatePath(flatParts: string[], isWindows: boolean): string | null {
  const pathSep = isWindows ? '\\' : '/';
  let currentPath = isWindows ? `${flatParts[0]}:\\` : '/';
  let consumedParts = isWindows ? 1 : 0;

  while (consumedParts < flatParts.length) {
    const remainingParts = flatParts.slice(consumedParts);
    const dirResult = listDirectoryImpl(currentPath);
    if (!dirResult.success) {
      break;
    }
    const dirContents = dirResult.value;

    let bestMatch: string | null = null;
    let bestMatchLength = 0;

    for (let numParts = Math.min(remainingParts.length, 5); numParts >= 1; numParts--) {
      const testParts = remainingParts.slice(0, numParts);
      const candidates: string[] = [];
      candidates.push(testParts.join('-'));
      if (numParts === 2) candidates.push(testParts.join('.'));
      if (numParts === 1) candidates.push('.' + testParts[0]);

      for (const candidate of candidates) {
        if (dirContents.includes(candidate)) {
          bestMatch = candidate;
          bestMatchLength = numParts;
          break;
        }
        for (const dirEntry of dirContents) {
          if (dirEntry.toLowerCase().startsWith(candidate.toLowerCase())) {
            bestMatch = dirEntry;
            bestMatchLength = numParts;
            break;
          }
        }
        if (bestMatch) break;
      }
      if (bestMatch) break;
    }

    if (bestMatch) {
      currentPath = currentPath + bestMatch;
      consumedParts += bestMatchLength;
    } else {
      const part = remainingParts[0];
      currentPath = currentPath + part;
      consumedParts += 1;
    }

    if (consumedParts < flatParts.length) {
      currentPath = currentPath + pathSep;
    }
  }

  return currentPath;
}

export function guessPathFromFlattenedName(flatPath: string, projectsDir: string): string {
  // Check metadata first
  const metadataPath = path.join(projectsDir, flatPath, 'metadata.json');
  if (fsSync.existsSync(metadataPath)) {
    try {
      const data = JSON.parse(fsSync.readFileSync(metadataPath, 'utf-8'));
      if (data && data.path) return data.path as string;
    } catch {}
  }

  // Windows-style flattened path (e.g., C--Users-username-...)
  const windowsMatch = flatPath.match(/^([A-Z])--(.+)$/);
  if (windowsMatch) {
    const [, driveLetter, restOfPath] = windowsMatch;
    const rawParts = restOfPath.split('-');
    const flatParts: string[] = [];
    for (let i = 0; i < rawParts.length; i++) {
      if (rawParts[i] === '' && i + 1 < rawParts.length) {
        flatParts.push('.' + rawParts[i + 1]);
        i++;
      } else if (rawParts[i] !== '') {
        flatParts.push(rawParts[i]);
      }
    }
    const allParts = [driveLetter, ...flatParts];
    const validatedPath = buildAndValidatePath(allParts, true);
    if (validatedPath) return validatedPath;
    return `${driveLetter}:\\` + flatParts.join('\\');
  }

  // Unix-style flattened path (starts with dash for absolute /)
  if (flatPath.startsWith('-')) {
    const rawParts = flatPath.split('-').filter((p) => p.length > 0);
    const unixParts = ['/', ...rawParts];
    const validatedPath = buildAndValidatePath(unixParts, false);
    if (validatedPath) return validatedPath;
    return '/' + rawParts.join('/');
  }

  // Fallback: return as-is, caller may validate
  return flatPath;
}

