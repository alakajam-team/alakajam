import * as fs from "fs";
import * as path from "path";

export interface EmptyDirectoryResult {
  removed: number;
  failed: number;
}

/**
 * Deletes the files directly inside a directory, keeping the directory itself and any subdirectory.
 * Files for which `keep(fileName)` returns true are left untouched.
 * Never throws: a missing directory is a no-op, and entries that can't be removed are counted and skipped.
 */
export async function emptyDirectory(directory: string, keep?: (fileName: string) => boolean): Promise<EmptyDirectoryResult> {
  const result: EmptyDirectoryResult = { removed: 0, failed: 0 };

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch {
    return result; // Missing or unreadable directory
  }

  for (const entry of entries) {
    if (entry.isDirectory() || keep?.(entry.name)) {
      continue;
    }
    try {
      await fs.promises.unlink(path.join(directory, entry.name));
      result.removed++;
    } catch {
      result.failed++;
    }
  }
  return result;
}
