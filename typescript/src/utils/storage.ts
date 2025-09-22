import { Result, Ok, Err } from './Result';

// Safe localStorage wrapper
export function getLocalStorageItem(key: string): Result<string | null> {
  try {
    if (typeof localStorage === 'undefined') {
      return Ok(null);
    }
    const value = localStorage.getItem(key);
    return Ok(value);
  } catch (error: any) {
    return Err(`Failed to read localStorage key '${key}'`, error);
  }
}

export function setLocalStorageItem(key: string, value: string): Result<void> {
  try {
    if (typeof localStorage === 'undefined') {
      return Err('localStorage is not available');
    }
    localStorage.setItem(key, value);
    return Ok(undefined);
  } catch (error: any) {
    return Err(`Failed to set localStorage key '${key}'`, error);
  }
}