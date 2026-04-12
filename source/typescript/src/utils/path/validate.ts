import fsSync from 'node:fs';
import { Ok, Err, type Result } from '../../utils/Result.js';

export function validatePathImpl(testPath: string): Result<boolean> {
  return Ok(fsSync.existsSync(testPath));
}

export function listDirectoryImpl(dirPath: string): Result<string[]> {
  if (!fsSync.existsSync(dirPath)) {
    return Err(`Directory does not exist: ${dirPath}`);
  }
  const contents = fsSync.readdirSync(dirPath);
  return Ok(contents);
}

