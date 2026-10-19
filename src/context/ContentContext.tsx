import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_CONTENT, type Review, type SiteContent } from "../content/defaults";
import { isPlainObject, migrateDataUrl, pruneImages, REF_PREFIX, refForUrl, urlForRef } from "../admin/imageStore";

const STORAGE_KEY = "munchivo-content-v1";

type ContentContextValue = {
  content: SiteContent;
  /** Replaces the whole content object (used by the admin panel). */
  setContent: (next: SiteContent) => void;
  /** Restores the built-in defaults. */
  resetContent: () => void;
  /** Adds a visitor review to the top of the review wall (used by the reviews page). */
  addReview: (review: Omit<Review, "id">) => void;
  /** Set when the browser refuses to persist changes (usually storage full). */
  saveError: string | null;
};

const ContentContext = createContext<ContentContextValue | null>(null);

function mergeContent(stored: unknown): SiteContent {
  if (!isPlainObject(stored)) return DEFAULT_CONTENT;
  const base = DEFAULT_CONTENT as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(base)) {
    const storedValue = stored[key];
    const baseValue = base[key];
    if (Array.isArray(baseValue)) {
      if (Array.isArray(storedValue)) result[key] = storedValue;
    } else if (isPlainObject(baseValue)) {
      if (!isPlainObject(storedValue)) continue;
      const merged: Record<string, unknown> = { ...baseValue };
      for (const subKey of Object.keys(baseValue)) {
        if (subKey in storedValue) merged[subKey] = storedValue[subKey];
      }
      result[key] = merged;
    } else if (storedValue !== undefined) {
      result[key] = storedValue;
    }
  }

  // Pages get a second level of merging so new editable fields keep their defaults.
  if (isPlainObject(stored.pages) && isPlainObject(base.pages)) {
    const pages: Record<string, unknown> = { ...base.pages };
    for (const pageKey of Object.keys(base.pages)) {
      const basePage = base.pages[pageKey];
      const storedPage = stored.pages[pageKey];
      if (isPlainObject(basePage) && isPlainObject(storedPage)) {
        pages[pageKey] = { ...basePage, ...storedPage };
      }
    }
    result.pages = pages;
  }

  return result as unknown as SiteContent;
}

/** Saved content from before the rebrand still points at old built-in assets — remap them to the new defaults. */
const MIGRATED_ASSETS: Record<string, string> = {
  "/images/logo.png": DEFAULT_CONTENT.site.logoSrc,
  "/images/hero-street-food.jpg": DEFAULT_CONTENT.pages.home.heroImage,
};

function migrateLogo(content: SiteContent): SiteContent {
  let migrated = content;
  if (migrated.site.logoSrc in MIGRATED_ASSETS) {
    migrated = { ...migrated, site: { ...migrated.site, logoSrc: MIGRATED_ASSETS[migrated.site.logoSrc] } };
  }
  if (migrated.pages.home.heroImage in MIGRATED_ASSETS) {
    migrated = { ...migrated, pages: { ...migrated.pages, home: { ...migrated.pages.home, heroImage: MIGRATED_ASSETS[migrated.pages.home.heroImage] } } };
  }
  return migrated;
}

function loadContent(): SiteContent {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? migrateLogo(mergeContent(JSON.parse(saved))) : DEFAULT_CONTENT;
  } catch {
    return DEFAULT_CONTENT;
  }
}

/* ------------------------------------------------------------------------ */
/* Image payload plumbing.                                                   */
/*                                                                            */
/* In memory the content holds displayable URLs (blob object URLs for user   */
/* uploads). When saving, those are swapped back to the compact `@idb:<id>`  */
/* references that live in IndexedDB, so localStorage only ever stores text  */
/* and small paths — uploading images no longer fills the browser storage.   */
/* ------------------------------------------------------------------------ */

/** Serializes in-memory URLs back into reference/storage-friendly form. */
function toPersistence(value: unknown, outRefs: Set<string>): unknown {
  if (typeof value === "string") {
    if (value.startsWith("blob:")) {
      const ref = refForUrl(value);
      if (ref) {
        outRefs.add(ref);
        return ref;
      }
    }
    if (value.startsWith(REF_PREFIX)) outRefs.add(value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPersistence(item, outRefs));
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) result[key] = toPersistence(child, outRefs);
    return result;
  }
  return value;
}

/** Swaps stored `@idb:` refs for display URLs; migrates legacy inline data URLs. */
async function hydrate(value: unknown, outRefs: Set<string>): Promise<unknown> {
  if (typeof value === "string") {
    if (value.startsWith(REF_PREFIX)) {
      outRefs.add(value);
      const url = await urlForRef(value);
      return url ?? value;
    }
    if (value.startsWith("data:image/") && value.length > 8_000) {
      // Old saves embedded images inline — move them into IndexedDB once.
      const ref = await migrateDataUrl(value);
      if (ref) {
        outRefs.add(ref);
        const url = await urlForRef(ref);
        if (url) return url;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => hydrate(item, outRefs)));
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = await hydrate(child, outRefs);
    }
    return result;
  }
  return value;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<SiteContent>(loadContent);
  const [saveError, setSaveError] = useState<string | null>(null);

  // One-time hydration after mount: move stored refs into display URLs and
  // pull any legacy inline data-URL images into IndexedDB so they stop
  // bloating localStorage.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const refs = new Set<string>();
      const hydrated = await hydrate(content, refs);
      if (cancelled) return;
      if (hydrated !== content) setContentState(hydrated as SiteContent);
      // Re-save the compact form so legacy payloads leave localStorage.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistence(hydrated, new Set())));
      } catch {
        // Little to do if this fails; the autosave error surface will report.
      }
      await pruneImages(refs);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const refs = new Set<string>();
      const persisted = toPersistence(content, refs);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      setSaveError(null);
      // Best-effort cleanup: drop uploads nothing references any more.
      void pruneImages(refs);
    } catch {
      setSaveError("Could not save — browser storage is full. Try removing a large uploaded image (Remove button on its image field), then save again.");
    }
  }, [content]);

  const setContent = useCallback((next: SiteContent) => setContentState(next), []);
  const resetContent = useCallback(() => setContentState(DEFAULT_CONTENT), []);
  const addReview = useCallback((review: Omit<Review, "id">) => {
    const id = `review-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setContentState((current) => ({
      ...current,
      reviews: {
        ...current.reviews,
        list: [{ ...review, id }, ...current.reviews.list],
      },
    }));
  }, []);

  const value = useMemo<ContentContextValue>(
    () => ({ content, setContent, resetContent, addReview, saveError }),
    [content, setContent, resetContent, addReview, saveError],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error("useContent must be used inside ContentProvider");
  return context;
}
