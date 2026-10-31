/**
 * Tells whether the current request path (which may include a query string or hash)
 * points to the given menu page URL.
 */
export function isMenuLinkActive(currentPath: string | undefined, menuUrl: string): boolean {
  if (!currentPath) {
    return false;
  }
  const pathWithoutQuery = currentPath.split(/[?#]/)[0];
  return pathWithoutQuery === menuUrl;
}
