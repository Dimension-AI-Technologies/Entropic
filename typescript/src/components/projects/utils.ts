// Project utility functions
import { Result, Ok, Err } from '../../utils/Result';

// Safe localStorage wrapper
export function getLocalStorageItem(key: string): Result<string | null> {
  // retyper:disable-next-line find-exceptions
  try {
    if (typeof localStorage === 'undefined') {
      return Ok(null);
    }
    const value = localStorage.getItem(key);
    return Ok(value);
  } catch (error: any) { // EXEMPTION: converting localStorage exception to Result<T>
    return Err(`Failed to read localStorage key '${key}'`, error);
  }
}

// Helper function to format dates in UK format: dd-MMM-yyyy
export function formatUKDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper function to format time in UK format: HH:mm
export function formatUKTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}