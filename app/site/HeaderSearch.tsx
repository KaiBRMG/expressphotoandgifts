"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { priceLabel, productHref } from "@/lib/catalog/listing";
import { queryWords, searchItems, searchShortcuts } from "@/lib/catalog/search";
import type { SearchIndex } from "@/app/api/search/route";
import { ArrowRight, Close, Search } from "./icons";
import { ProductImage } from "./ProductImage";
import { track } from "./track";

/** Products the window lists before handing over to "See all". */
const SHOWN = 6;

/** The index is the same for every page and every opening, so it is fetched once per visit. */
let index: Promise<SearchIndex> | null = null;
const loadIndex = () =>
  (index ??= fetch("/api/search")
    .then((r) => {
      if (!r.ok) throw new Error(`Search index: ${r.status}`);
      return r.json() as Promise<SearchIndex>;
    })
    .catch((e) => {
      index = null; // let the next opening try again
      throw e;
    }));

export const seeAllHref = (query: string) => `/shop/all?q=${encodeURIComponent(query.trim())}`;

/**
 * The header's search. Closed, it is the bar's search mark; opened, it grows
 * leftwards into a field, and a window under the bar's right end lists what
 * matches as the customer types: the shelves and filters the words name, then
 * the products, then "See all" for the full list at /shop/all?q=.
 *
 * A combobox in the WAI-ARIA sense: focus stays in the field and the arrow
 * keys move through the window, so it works the same from a keyboard, a
 * screen reader and a thumb.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);

  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const close = (refocus = true) => {
    setOpen(false);
    setActive(-1);
    if (refocus) requestAnimationFrame(() => toggle.current?.focus());
  };

  const openSearch = () => {
    setOpen(true);
    setFailed(false);
    loadIndex().then(setLoaded, () => setFailed(true));
  };

  // Focus the field once it exists, the last search selected so typing
  // replaces it and an arrow key keeps it.
  useEffect(() => {
    if (open) input.current?.select();
  }, [open]);

  // A tap anywhere outside closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  // Arriving on another page (back, forward) closes it, adjusted during render.
  const [page, setPage] = useState(pathname);
  if (page !== pathname) {
    setPage(pathname);
    setOpen(false);
  }

  const { products, shortcuts } = useMemo(
    () => ({
      products: loaded ? searchItems(loaded.listings, query, loaded.vocabulary) : [],
      shortcuts: loaded ? searchShortcuts(loaded.listings, query, loaded.vocabulary) : [],
    }),
    [loaded, query],
  );
  const top = products.slice(0, SHOWN);
  const typed = queryWords(query).length > 0;

  // A search that finds nothing, once the customer has stopped typing: what they wanted that the shop doesn't list.
  const missed = loaded !== null && typed && products.length === 0 && shortcuts.length === 0;
  useEffect(() => {
    if (!missed) return;
    const timer = setTimeout(() => track({ step: "miss", q: query }), 1500);
    return () => clearTimeout(timer);
  }, [missed, query]);

  // Every row the arrow keys reach, in the order they are drawn.
  const rows = [
    ...shortcuts.map((s) => s.href),
    ...top.map((p) => productHref(p.slug)),
    ...(products.length > 0 ? [seeAllHref(query)] : []),
  ];
  const rowId = (i: number) => `${id}-row-${i}`;

  const go = (href: string) => {
    close(false);
    router.push(href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (rows.length === 0) return;
      e.preventDefault();
      // Down from the last row, or up from the first, goes back to the field (-1).
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => ((i + 1 + step + rows.length + 1) % (rows.length + 1)) - 1);
    } else if (e.key === "Enter" && active >= 0) {
      // A row is chosen; otherwise Enter submits the form, which is "See all".
      e.preventDefault();
      go(rows[active]);
    }
  };

  return (
    <div className="search" ref={root} data-open={open ? "true" : undefined}>
      <button
        ref={toggle}
        type="button"
        className="header__icon search__toggle"
        aria-label="Search the shop"
        aria-expanded={open}
        aria-controls={open ? `${id}-field` : undefined}
        onClick={() => (open ? close() : openSearch())}
      >
        <Search size={21} />
      </button>

      {open ? (
        <div className="search__panel">
          <form
            id={`${id}-field`}
            className="search__field on-light"
            role="search"
            action="/shop/all"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed) go(seeAllHref(query));
            }}
          >
            <Search size={20} aria-hidden="true" />
            <input
              ref={input}
              name="q"
              type="search"
              role="combobox"
              aria-label="Search products, categories and occasions"
              aria-expanded
              aria-controls={`${id}-results`}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? rowId(active) : undefined}
              placeholder="Mugs, frames, birthday…"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
            />
            <button type="button" className="search__close" aria-label="Close search" onClick={() => close()}>
              <Close size={20} />
            </button>
          </form>

          <div className="search__window on-light">
            {failed ? (
              <p className="search__note">
                Search isn&rsquo;t loading right now.{" "}
                <Link className="inline-link" href="/shop/all">
                  Browse all products
                </Link>
              </p>
            ) : !loaded ? (
              <p className="search__note" aria-live="polite">
                Getting the shop ready…
              </p>
            ) : !typed ? (
              <p className="search__note">Search by product, category or occasion.</p>
            ) : products.length === 0 ? (
              <p className="search__note" aria-live="polite">
                Nothing matches &ldquo;{query.trim()}&rdquo;. Try a product, like <em>mug</em>, or an
                occasion, like <em>birthday</em>.
              </p>
            ) : (
              <>
                <p className="visually-hidden" aria-live="polite">
                  {products.length} {products.length === 1 ? "product matches" : "products match"}
                </p>

                {/* Choosing any row leaves for its page: the click bubbles here. */}
                <div id={`${id}-results`} role="listbox" aria-label="Search results" onClick={() => close(false)}>
                  {shortcuts.length > 0 ? (
                    <ul className="search__shortcuts" role="presentation">
                      {shortcuts.map((s, i) => (
                        <li key={s.href} role="presentation">
                          <Link
                            id={rowId(i)}
                            role="option"
                            aria-selected={active === i}
                            className="search__shortcut"
                            href={s.href}
                          >
                            <span className="search__kind">{s.kind}</span>
                            {s.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <ul className="search__results" role="presentation">
                    {top.map((p, j) => {
                      const i = shortcuts.length + j;
                      return (
                        <li key={p.slug} role="presentation">
                          <Link
                            id={rowId(i)}
                            role="option"
                            aria-selected={active === i}
                            className="search__result"
                            href={productHref(p.slug)}
                          >
                            <span className="search__thumb">
                              {p.photo ? (
                                <ProductImage code={p.photo} alt="" width={400} height={400} sizes="56px" />
                              ) : null}
                            </span>
                            <span className="search__text">
                              <span className="search__name">{p.name}</span>
                              <span className="search__meta">
                                {p.category} · {priceLabel(p)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <Link
                    id={rowId(rows.length - 1)}
                    role="option"
                    aria-selected={active === rows.length - 1}
                    className="btn btn--blue search__all"
                    href={seeAllHref(query)}
                  >
                    See all {products.length} {products.length === 1 ? "result" : "results"}
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
