/**
 * Functions for helping with entry importer implementations
 *
 * @module services/entry-importers/entry-importers-tools
 */

const PLATFORM_KEYWORDS = {
  Windows: ["windows", "win32", "win64", "exe", "java", "jar"],
  Linux: ["linux", "debian", "ubuntu", "java", "jar"],
  Mac: ["mac", "osx", "os/x", "os x", "java", "jar"],
  Mobile: ["android", "apk"],
  Web: ["web", "flash", "swf", "html", "webgl", "canvas"],
};

export function guessPlatforms(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const platforms = [];
  Object.keys(PLATFORM_KEYWORDS).forEach((platform) => {
    for (const platformKeyword of PLATFORM_KEYWORDS[platform]) {
      if (normalizedText.indexOf(platformKeyword) !== -1) {
        platforms.push(platform);
        break;
      }
    }
  });
  return platforms;
}

export function capitalizeAllWords(str: string): string {
  // Source: https://stackoverflow.com/a/38530325/1213677
  return str.replace(/(^|\s)\S/g, (l) => l.toUpperCase());
}
