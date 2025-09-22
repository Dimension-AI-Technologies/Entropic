import { Result, Ok, Err } from './Result.js';

/**
 * Safely parse JSON string, returning Result instead of throwing
 */
export function parseJsonSafe(json: string): Result<any> {
  if (!json.trim()) return Err('Empty JSON string');

  // retyper:disable-next-line find-exceptions
  try {
    const parsed = JSON.parse(json);
    return Ok(parsed);
  } catch (error: any) { // EXEMPTION: converting JSON.parse exception to Result<T>
    return Err('Invalid JSON', error);
  }
}