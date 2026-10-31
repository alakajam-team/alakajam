const PAGE_RATIO = 0.9;
const EDGE_TOLERANCE_PX = 2;

/**
 * Wires the arrow buttons of carousel rows (see carousel.macros.tsx).
 * Without JS the row remains swipeable/scrollable.
 */
export default function carousel(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(bindCarousel);
}

function bindCarousel(row: HTMLElement): void {
  const viewport = row.querySelector<HTMLElement>(".carousel-row__viewport");
  const prev = row.querySelector<HTMLButtonElement>(".carousel-row__arrow--prev");
  const next = row.querySelector<HTMLButtonElement>(".carousel-row__arrow--next");
  if (!viewport || !prev || !next) {
    return;
  }

  prev.addEventListener("click", () => page(viewport, -1));
  next.addEventListener("click", () => page(viewport, 1));

  let frame = 0;
  const scheduleUpdate = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => updateArrows(viewport, prev, next));
  };
  viewport.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateArrows(viewport, prev, next);
}

function page(viewport: HTMLElement, direction: -1 | 1): void {
  viewport.scrollBy({ left: direction * viewport.clientWidth * PAGE_RATIO, behavior: "smooth" });
}

function updateArrows(viewport: HTMLElement, prev: HTMLElement, next: HTMLElement): void {
  const maxScroll = viewport.scrollWidth - viewport.clientWidth;
  prev.hidden = viewport.scrollLeft <= EDGE_TOLERANCE_PX;
  next.hidden = viewport.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX;
}
