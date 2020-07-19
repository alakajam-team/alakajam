import "preact";

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      ["jsx-wrapper"]: HTMLAttributes<HTMLElement>;
    }

    interface HTMLAttributes<RefType extends EventTarget = EventTarget>
      extends preact.ClassAttributes<RefType>, DOMAttributes<RefType> {
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
      colspan?: string;
      readonly?: boolean;
      enctype?: string;
      formnovalidate?: boolean;
    }
  }
}
