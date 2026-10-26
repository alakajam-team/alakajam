/**
 * Exposes the bundled jQuery instance as `window.$` / `window.jQuery`, for the legacy plugins
 * evaluated as raw scripts, and the scripts loaded separately by the templates.
 */

(window as any).$ = (window as any).jQuery = $;
