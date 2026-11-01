import "preact";

declare module "preact/src/dom" {
  /*
   * Templates are rendered to static HTML on the server,
   * so event handlers are inline scripts (strings) and attributes use their HTML names.
   */
  interface HTMLAttributes<RefType extends EventTarget = EventTarget> {
    // Image events
    onload?: string;

    // Form events
    oninput?: string;
    onchange?: string;
    onfocus?: string;
    onblur?: string;
    onsubmit?: string;

    // Keyboard events
    onkeydown?: string;
    onkeyup?: string;

    // Mouse events
    onclick?: string;
    onmousedown?: string;
    onmouseup?: string;
    onmouseenter?: string;
    onmouseleave?: string;
    onmousemove?: string;

    // Non-events
    colspan?: number;
    readonly?: boolean;
    enctype?: string;
    formnovalidate?: boolean;
    charset?: string;
    allow?: string;
    disabled?: boolean;
    width?: string;
  }
}

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      ["jsx-wrapper"]: HTMLAttributes<HTMLElement>;
      ["iframe"]: HTMLAttributes<HTMLElement>;
    }
  }
}
