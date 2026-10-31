import { existsSync } from "fs";
import * as path from "path";

/**
 * Finds the project root, i.e. the closest parent folder containing a package.json.
 * Works the same from sources (server/) and from the build output (dist/server/).
 *
 * Kept free of project imports because it is used by the config and logger bootstrapping.
 */
export function findProjectRoot(startFolder: string = __dirname): string {
  let folder = path.resolve(startFolder);
  while (!existsSync(path.join(folder, "package.json"))) {
    const parent = path.dirname(folder);
    if (parent === folder) {
      throw new Error(`Could not find the project root (package.json) from ${startFolder}`);
    }
    folder = parent;
  }
  return folder;
}
