export function createFlattenedPath(realPath: string): string {
  return realPath.replace(/[\/\\]/g, '-');
}

