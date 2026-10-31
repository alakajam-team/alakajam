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
  /** Extra content aligned next to the title */
  headerActions?: JSX.Element;
  /** Optional last card, e.g. a "see all" link */
  endCard?: JSX.Element;
} = {}): JSX.Element {
  if (!items || items.length === 0) {
    return <></>;
  }

  return <div class={`carousel-row ${options.id ? "carousel-row--" + options.id : ""}`} role="region"
    aria-roledescription="carousel" aria-label={options.title}>
    {ifSet(options.title, () =>
      <div class="d-flex mt-3">
        <div class="horizontal-bar mt-0">{options.title}</div>
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
        {ifSet(options.endCard, () =>
          <div class="carousel-row__item carousel-row__item--end">{options.endCard}</div>
        )}
      </div>
      <button type="button" class="carousel-row__arrow carousel-row__arrow--next" aria-label="Next" hidden>
        <span class="fas fa-chevron-right"></span>
      </button>
    </div>
  </div>;
}

/** Generic last card of a carousel, linking to the complete list */
export function seeAllCard(label: string, href: string): JSX.Element {
  return <a href={href} class="card carousel-row__see-all">
    <span class="fas fa-arrow-circle-right carousel-row__see-all-icon"></span>
    <span>{label}</span>
  </a>;
}
