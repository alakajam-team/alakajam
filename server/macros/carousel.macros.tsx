import React, { JSX } from "preact";
import { ifSet } from "./jsx-utils";

/**
 * Netflix-like row of cards: swipeable with the next card peeking on mobile,
 * paged with arrow buttons on tablet/desktop (see client/scripts/common/carousel.ts).
 */
export function carousel(items: JSX.Element[], options: {
  /** Modifier for the row, rendered as `carousel-row--<id>` (handy for tests/styling) */
  id?: string;
  title?: string;
  /** Look of the row: boxed cards (default), invisible cards, or a single global border */
  variant?: "cards" | "plain" | "framed";
  /** Makes the title a link, e.g. to the complete list */
  titleHref?: string;
  /** Extra content aligned next to the title */
  headerActions?: JSX.Element;
} = {}): JSX.Element {
  if (!items || items.length === 0) {
    return <></>;
  }

  return <div class={`carousel-row carousel-row--${options.variant || "cards"} ${options.id ? "carousel-row--" + options.id : ""}`} role="region"
    aria-roledescription="carousel" aria-label={options.title}>
    {ifSet(options.title, () =>
      <div class="d-flex mt-3">
        <div class="horizontal-bar mt-0">
          {options.titleHref
            ? <a href={options.titleHref} class="carousel-row__title-link">
              {options.title} <span class="fas fa-chevron-right carousel-row__title-chevron"></span>
            </a>
            : options.title}
        </div>
        {ifSet(options.headerActions, () =>
          <div class="mt-3 ml-2 text-right">{options.headerActions}</div>
        )}
      </div>
    )}
    <div class="carousel-row__frame">
      <button type="button" class="carousel-row__arrow carousel-row__arrow--prev" aria-label="Previous" hidden>
        <span class="fas fa-chevron-left"></span>
      </button>
      <div class="carousel-row__viewport">
        {items.map(item =>
          <div class="carousel-row__item">{item}</div>
        )}
      </div>
      <button type="button" class="carousel-row__arrow carousel-row__arrow--next" aria-label="Next" hidden>
        <span class="fas fa-chevron-right"></span>
      </button>
    </div>
  </div>;
}
