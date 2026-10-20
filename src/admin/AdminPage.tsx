import { createContext, useContext, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CheckCircle2, Download, ExternalLink, Lock, LogOut, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { DEFAULT_CONTENT, type Product, type Review, type SiteContent, type TeamMember } from "../content/defaults";
import { AdminGrid, AdminSection, ImageField, ListControls, TextAreaField, TextField } from "./fields";
import { fitContentForStorage, estimateContentBytes } from "./imageUpload";
import { ADMIN_CODE } from "./adminCode";
import { onPublishStatus, requestPublishNow, type PublishState } from "./publish";
import { deletePendingReview, fetchPendingReviews, markPendingApproved, type PendingReview } from "../reviewApi";
import { buildFreshness } from "../version";
import "./admin.css";

const AUTH_KEY = "munchivo-admin-auth-v1";

type TabId = "home" | "menu" | "about" | "contact" | "order" | "products" | "team" | "reviews" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "menu", label: "Menu" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "order", label: "Order" },
  { id: "products", label: "Products" },
  { id: "team", label: "Team" },
  { id: "reviews", label: "Reviews" },
  { id: "settings", label: "Site settings" },
];

/* ------------------------------------------------------------------ */
/* Update plumbing                                                     */
/* ------------------------------------------------------------------ */

type AdminActions = {
  setSite: (patch: Partial<SiteContent["site"]>) => void;
  setPage: <K extends keyof SiteContent["pages"]>(key: K, patch: Partial<SiteContent["pages"][K]>) => void;
  updateProducts: (fn: (products: Product[]) => Product[]) => void;
  updateTeam: (fn: (team: TeamMember[]) => TeamMember[]) => void;
  updateReviews: (fn: (reviews: SiteContent["reviews"]) => SiteContent["reviews"]) => void;
  replaceContent: (next: SiteContent) => void;
};

const AdminContext = createContext<{ draft: SiteContent; actions: AdminActions } | null>(null);

function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside AdminPage");
  return context;
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}

function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const moved = next[index];
  next[index] = next[target];
  next[target] = moved;
  return next;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

export function AdminPage() {
  const { content, setContent, resetContent, saveError } = useContent();
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.title = "Site Admin";
  }, []);

  if (!authed) {
    return (
      <LoginScreen
        onSuccess={() => {
          try {
            sessionStorage.setItem(AUTH_KEY, "1");
          } catch {
            // Session-only fallback: the code still unlocks this visit.
          }
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <AdminEditor
      content={content}
      setContent={setContent}
      resetContent={resetContent}
      saveError={saveError}
      onLogout={() => {
        try {
          sessionStorage.removeItem(AUTH_KEY);
        } catch {
          // Ignore storage failures on logout.
        }
        setAuthed(false);
      }}
    />
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const { content } = useContent();
  const logo = content.site.logoSrc;

  return (
    <div className="adm-login">
      <form
        className="adm-login-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (code === ADMIN_CODE) {
            setError(false);
            onSuccess();
          } else {
            setError(true);
          }
        }}
      >
        {logo ? <img src={logo} alt={content.site.name} /> : <span className="adm-field-label">{content.site.name}</span>}
        <h1>Admin access</h1>
        <p>Enter the access code to manage the site content.</p>
        <TextField
          label="Access code"
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(false);
          }}
          type="password"
        />
        <button type="submit" className="adm-btn" style={{ width: "100%", justifyContent: "center" }}>
          <Lock size={16} aria-hidden="true" /> Unlock
        </button>
        {error && <p className="adm-login-error">That code is not correct. Try again.</p>}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Publish status line                                                 */
/* ------------------------------------------------------------------ */

function publishStatusText(publishState: PublishState, saveStatus: "idle" | "saving" | "saved", unpublished = false): string {
  switch (publishState.state) {
    case "uploading":
      return "Saved · uploading images to the repository…";
    case "committing":
      return "Saved · pushing to the live site…";
    case "published":
      return "Saved · live site updates in 1–2 min";
    case "local-only":
      return "Saved locally (dev preview — click Save & publish on the live site)";
    case "failed":
      return `Saved locally · publish failed: ${publishState.message ?? "unknown error"}`;
    default:
      if (saveStatus === "saving") return "Saving…";
      if (unpublished) return "Unpublished changes · click Save & publish";
      return saveStatus === "saved" ? "All changes saved" : "No changes yet";
  }
}

function AdminEditor({
  content,
  setContent,
  resetContent,
  saveError,
  onLogout,
}: {
  content: SiteContent;
  setContent: (next: SiteContent) => void;
  resetContent: () => void;
  saveError: string | null;
  onLogout: () => void;
}) {
  const [draft, setDraft] = useState<SiteContent>(content);
  const [tab, setTab] = useState<TabId>("home");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [publishState, setPublishState] = useState<PublishState>({ state: "idle" });
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const lastShrinkSize = useRef<number | null>(null);
  const lastSeenContent = useRef(content);

  // Adopt refreshed content (e.g. after the server sync load) unless the
  // admin has unsaved edits — those always win and publish on their own.
  useEffect(() => {
    const previous = lastSeenContent.current;
    lastSeenContent.current = content;
    if (previous !== content) setDraft((current) => (current === previous ? content : current));
  }, [content]);

  // Subscribe to the publish pipeline (Git commit -> Vercel rebuild).
  useEffect(() => onPublishStatus(setPublishState), []);

  // Deployments change the build id; a stale admin tab must not publish old
  // content. Poll periodically and offer a refresh when a new build is live.
  const [staleBundle, setStaleBundle] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      void buildFreshness().then((freshness) => {
        if (!cancelled) setStaleBundle(freshness === "stale");
      });
    };
    check();
    const interval = setInterval(check, 45_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Unpublished-changes flag: any draft edit marks it, a successful publish
  // clears it. Compared by JSON so adopting fresh server content (a new
  // object reference with the same data) never counts as a local edit.
  const publishedJsonRef = useRef(JSON.stringify(content));
  const [unpublished, setUnpublished] = useState(false);
  useEffect(() => {
    setUnpublished(JSON.stringify(draft) !== publishedJsonRef.current);
  }, [draft]);
  useEffect(() => {
    if (publishState.state === "published") {
      publishedJsonRef.current = JSON.stringify(draft);
      setUnpublished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishState]);
  // Stop accidental close/refresh while edits are only in this browser.
  useEffect(() => {
    if (!unpublished) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unpublished]);

  /**
   * Local save: fit the content (recompressing images if needed) into browser
   * storage and commit it to the site context. Returns the saved content.
   */
  async function saveToBrowser(current: SiteContent): Promise<SiteContent> {
    const fitted = await fitContentForStorage(current);
    // Only take the shrink path when it actually reduces the total size,
    // otherwise a save that still fails would loop forever.
    if (fitted !== current && lastShrinkSize.current !== estimateContentBytes(fitted)) {
      lastShrinkSize.current = estimateContentBytes(fitted);
      setDraft(fitted as SiteContent);
      setFlash("Images were compressed a little more so everything fits in browser storage.");
      return fitted as SiteContent;
    }
    lastShrinkSize.current = null;
    setContent(current);
    return current;
  }

  // Autosave is local-only: edits persist in this browser immediately, but the
  // live site is only updated when "Save & publish" is clicked — so a batch of
  // edits becomes exactly one commit (and one Vercel deploy).
  useEffect(() => {
    if (draft === content) return;
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        await saveToBrowser(draft);
        setStatus("saved");
      })();
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  /** Manual publish: save locally first, then push everything in one commit. */
  async function handleSaveAndPublish() {
    setStatus("saving");
    const saved = await saveToBrowser(draft);
    setStatus("saved");
    setFlash("Publishing all your changes to the live site…");
    requestPublishNow(saved);
  }

  const actions: AdminActions = {
    setSite: (patch) => setDraft((current) => ({ ...current, site: { ...current.site, ...patch } })),
    setPage: (key, patch) =>
      setDraft((current) => ({
        ...current,
        pages: {
          ...current.pages,
          [key]: { ...current.pages[key], ...patch },
        },
      })),
    updateProducts: (fn) => setDraft((current) => ({ ...current, products: fn(current.products) })),
    updateTeam: (fn) => setDraft((current) => ({ ...current, team: fn(current.team) })),
    updateReviews: (fn) => setDraft((current) => ({ ...current, reviews: fn(current.reviews) })),
    replaceContent: (next) => setDraft(next),
  };

  function handleExport() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "munchivo-content.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as SiteContent;
      if (typeof parsed !== "object" || parsed === null || !("site" in parsed) || !("products" in parsed)) {
        throw new Error("Unexpected file");
      }
      setDraft(parsed);
      setFlash("Backup imported. Click \u201cSave & publish\u201d to push it to the live site.");
    } catch {
      setFlash("That file could not be imported.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  const statusClass = saveError ? "is-error" : status === "saved" ? "is-saved" : "";

  return (
    <AdminContext.Provider value={{ draft, actions }}>
      <div className="adm">
        <header className="adm-top">
          <div className="adm-top-row">
            <div className="adm-brand">
              {draft.site.logoSrc ? <img src={draft.site.logoSrc} alt="" /> : null}
              <div>
                <strong>{draft.site.name}</strong>
                <span>Content manager</span>
              </div>
            </div>
            <div className="adm-top-actions">
              <span className={`adm-save-status ${statusClass}`} role="status">
                {saveError ?? publishStatusText(publishState, status, unpublished)}
              </span>
              <button
                type="button"
                className="adm-btn adm-btn--cream adm-btn--small"
                disabled={!unpublished || publishState.state === "uploading" || publishState.state === "committing"}
                onClick={() => void handleSaveAndPublish()}
              >
                <Save size={15} aria-hidden="true" /> Save &amp; publish
              </button>
              {publishState.state === "failed" && (
                <button type="button" className="adm-btn adm-btn--cream adm-btn--small" onClick={() => requestPublishNow(draft)}>
                  <RotateCcw size={15} aria-hidden="true" /> Retry publish
                </button>
              )}
              <a className="adm-btn adm-btn--cream adm-btn--small" href="#/">
                <ExternalLink size={15} aria-hidden="true" /> View site
              </a>
              <button type="button" className="adm-btn adm-btn--cream adm-btn--small" onClick={onLogout}>
                <LogOut size={15} aria-hidden="true" /> Log out
              </button>
            </div>
          </div>
          <nav className="adm-tabs" aria-label="Admin sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`adm-tab${tab === item.id ? " is-active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="adm-main">
          {staleBundle && (
            <p className="adm-note adm-note--warn">
              A newer version of the site just went live. Refresh this page (Ctrl+Shift+R) before making changes — publishing from an outdated tab is blocked.
              <button type="button" className="adm-btn adm-btn--small" style={{ marginLeft: 12 }} onClick={() => window.location.reload()}>
                Refresh now
              </button>
            </p>
          )}
          {flash && <p className="adm-note">{flash}</p>}
          {tab === "home" && <HomeTab />}
          {tab === "menu" && <MenuTab />}
          {tab === "about" && <AboutTab />}
          {tab === "contact" && <ContactTab />}
          {tab === "order" && <OrderTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "team" && <TeamTab />}
          {tab === "reviews" && <ReviewsTab />}
          {tab === "settings" && (
            <SettingsTab
              onExport={handleExport}
              onImport={handleImport}
              onReset={() => {
                if (window.confirm("Reset all site content back to the original defaults? This cannot be undone.")) {
                  resetContent();
                  setDraft(DEFAULT_CONTENT);
                  setFlash("Content reset to defaults.");
                }
              }}
              onSync={() => {
                requestPublishNow(draft);
                setFlash("Publishing your content to the live site now.");
              }}
              importRef={importRef}
            />
          )}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function HomeTab() {
  const { draft, actions } = useAdmin();
  const home = draft.pages.home;
  const set = (patch: Partial<typeof home>) => actions.setPage("home", patch);

  return (
    <>
      <AdminSection title="Hero (top of the home page)">
        <p className="adm-note">
          The home hero is a text-and-cards composition — there is no single hero photo here. The photo cards come from
          the Products tab (next section), and the big Experience section photo has its own upload below.
        </p>
        <AdminGrid>
          <TextField label="Big brand title" value={home.heroTitle} onChange={(heroTitle) => set({ heroTitle })} hint="A dot is added at the end automatically." />
          <span />
        </AdminGrid>
        <AdminGrid>
          <TextField label="Heading line 1" value={home.heroHeadingLine1} onChange={(heroHeadingLine1) => set({ heroHeadingLine1 })} />
          <TextField label="Heading line 2" value={home.heroHeadingLine2} onChange={(heroHeadingLine2) => set({ heroHeadingLine2 })} />
        </AdminGrid>
        <TextAreaField label="Intro paragraph" value={home.heroText} onChange={(heroText) => set({ heroText })} />
        <AdminGrid>
          <TextField label="Small pill above the title" value={home.heroKicker} onChange={(heroKicker) => set({ heroKicker })} />
          <TextField label="Note under the buttons" value={home.heroTrust} onChange={(heroTrust) => set({ heroTrust })} />
        </AdminGrid>
        <AdminGrid>
          <TextField label="First button label" value={home.heroPrimaryCta} onChange={(heroPrimaryCta) => set({ heroPrimaryCta })} />
          <TextField label="Second text link" value={home.heroSecondaryCta} onChange={(heroSecondaryCta) => set({ heroSecondaryCta })} />
          <TextField label="Handwritten label beside the cards" value={home.heroFanLabel} onChange={(heroFanLabel) => set({ heroFanLabel })} />
        </AdminGrid>
        <p className="adm-note">The dish cards in the hero are the first 6 items in the Products tab — their photos are editable right below.</p>
      </AdminSection>

      <AdminSection title="Hero dish cards (the fan)">
        <AdminGrid>
          {draft.products.slice(0, 6).map((product, index) => (
            <ImageField
              key={product.id}
              label={`Card ${index + 1} · ${product.name}`}
              value={product.image}
              onChange={(image) =>
                actions.updateProducts((list) => list.map((p) => (p.id === product.id ? { ...p, image } : p)))
              }
              hint="Also shown on the menu page."
            />
          ))}
        </AdminGrid>
      </AdminSection>

      <AdminSection title="Signature lineup">
        <AdminGrid>
          <TextField label="Eyebrow" value={home.signatureEyebrow} onChange={(signatureEyebrow) => set({ signatureEyebrow })} />
          <TextField label="Heading line 1" value={home.signatureTitleLine1} onChange={(signatureTitleLine1) => set({ signatureTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={home.signatureTitleLine2} onChange={(signatureTitleLine2) => set({ signatureTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Side paragraph" value={home.signatureAside} onChange={(signatureAside) => set({ signatureAside })} />
        <TextField label="Link below (last line)" value={home.signatureLinkLabel} onChange={(signatureLinkLabel) => set({ signatureLinkLabel })} />
        <p className="adm-note">The product cards in this section are managed in the Products tab.</p>
      </AdminSection>

      <AdminSection title="Experience section">
        <ImageField label="Main image" value={home.experienceImage} onChange={(experienceImage) => set({ experienceImage })} />
        <TextField label="Main image description (alt text)" value={home.experienceImageAlt} onChange={(experienceImageAlt) => set({ experienceImageAlt })} />
        <AdminGrid>
          <ImageField label="Small card image 1" value={home.experienceCardOneImage} onChange={(experienceCardOneImage) => set({ experienceCardOneImage })} />
          <ImageField label="Small card image 2" value={home.experienceCardTwoImage} onChange={(experienceCardTwoImage) => set({ experienceCardTwoImage })} />
        </AdminGrid>
        <AdminGrid>
          <TextField label="Eyebrow" value={home.experienceEyebrow} onChange={(experienceEyebrow) => set({ experienceEyebrow })} />
          <TextField label="Heading line 1" value={home.experienceTitleLine1} onChange={(experienceTitleLine1) => set({ experienceTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={home.experienceTitleLine2} onChange={(experienceTitleLine2) => set({ experienceTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={home.experienceText} onChange={(experienceText) => set({ experienceText })} />
        <AdminGrid>
          <TextField label="First button label" value={home.experiencePrimaryCta} onChange={(experiencePrimaryCta) => set({ experiencePrimaryCta })} />
          <TextField label="Second text link" value={home.experienceSecondaryCta} onChange={(experienceSecondaryCta) => set({ experienceSecondaryCta })} />
        </AdminGrid>

        <h3 className="adm-field-label" style={{ marginTop: 10 }}>Steps</h3>
        {home.steps.map((step, index) => (
          <div className="adm-item" key={index}>
            <div className="adm-item-head">
              <strong>Step {index + 1}</strong>
              <ListControls
                index={index}
                length={home.steps.length}
                onMove={(direction) => set({ steps: moveItem(home.steps, index, direction) })}
                onRemove={() => set({ steps: removeAt(home.steps, index) })}
                removeLabel="Remove step"
              />
            </div>
            <AdminGrid>
              <TextField label="Title" value={step.title} onChange={(title) => set({ steps: replaceAt(home.steps, index, { ...step, title }) })} />
              <TextField label="Text" value={step.text} onChange={(text) => set({ steps: replaceAt(home.steps, index, { ...step, text }) })} />
            </AdminGrid>
          </div>
        ))}
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={() => set({ steps: [...home.steps, { title: "New step", text: "" }] })}>
          <Plus size={15} aria-hidden="true" /> Add step
        </button>
      </AdminSection>

      <AdminSection title="Statement band">
        <AdminGrid>
          <TextField label="Pill label" value={home.statementPill} onChange={(statementPill) => set({ statementPill })} />
          <TextField label="Line 1" value={home.statementLine1} onChange={(statementLine1) => set({ statementLine1 })} />
          <TextField label="Line 2" value={home.statementLine2} onChange={(statementLine2) => set({ statementLine2 })} />
          <TextField label="Line 3 (italic)" value={home.statementLine3} onChange={(statementLine3) => set({ statementLine3 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={home.statementText} onChange={(statementText) => set({ statementText })} />
        <AdminGrid>
          <TextField label="First button label" value={home.statementPrimaryCta} onChange={(statementPrimaryCta) => set({ statementPrimaryCta })} />
          <TextField label="Second button label" value={home.statementSecondaryCta} onChange={(statementSecondaryCta) => set({ statementSecondaryCta })} />
        </AdminGrid>
        <AdminGrid>
          <TextField label="Main card caption" value={home.statementCardOneCaption} onChange={(statementCardOneCaption) => set({ statementCardOneCaption })} />
          <TextField label="Side card caption" value={home.statementCardTwoCaption} onChange={(statementCardTwoCaption) => set({ statementCardTwoCaption })} />
        </AdminGrid>
        <p className="adm-note">The two photo cards here use the photos of the first two products in the Products tab.</p>
        <h3 className="adm-field-label" style={{ marginTop: 10 }}>Stats</h3>
        {home.statementStats.map((stat, index) => (
          <div className="adm-item" key={index}>
            <div className="adm-item-head">
              <strong>Stat {index + 1}</strong>
              <ListControls
                index={index}
                length={home.statementStats.length}
                onMove={(direction) => set({ statementStats: moveItem(home.statementStats, index, direction) })}
                onRemove={() => set({ statementStats: removeAt(home.statementStats, index) })}
                removeLabel="Remove stat"
              />
            </div>
            <AdminGrid>
              <TextField label="Value" value={stat.value} onChange={(value) => set({ statementStats: replaceAt(home.statementStats, index, { ...stat, value }) })} />
              <TextField label="Label" value={stat.label} onChange={(label) => set({ statementStats: replaceAt(home.statementStats, index, { ...stat, label }) })} />
            </AdminGrid>
          </div>
        ))}
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--small"
          onClick={() => set({ statementStats: [...home.statementStats, { value: "00", label: "label" }] })}
        >
          <Plus size={15} aria-hidden="true" /> Add stat
        </button>
      </AdminSection>

      <AdminSection title="Why Munchivo cards">
        <AdminGrid>
          <TextField label="Eyebrow" value={home.whyEyebrow} onChange={(whyEyebrow) => set({ whyEyebrow })} />
          <TextField label="Heading line 1" value={home.whyTitleLine1} onChange={(whyTitleLine1) => set({ whyTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={home.whyTitleLine2} onChange={(whyTitleLine2) => set({ whyTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Side paragraph" value={home.whyAside} onChange={(whyAside) => set({ whyAside })} />
        <TextField label="Link below the heading" value={home.whyLinkLabel} onChange={(whyLinkLabel) => set({ whyLinkLabel })} />

        {home.whyCards.map((card, index) => (
          <div className="adm-item" key={index}>
            <div className="adm-item-head">
              <strong>Card {card.num || index + 1}</strong>
              <ListControls
                index={index}
                length={home.whyCards.length}
                onMove={(direction) => set({ whyCards: moveItem(home.whyCards, index, direction) })}
                onRemove={() => set({ whyCards: removeAt(home.whyCards, index) })}
                removeLabel="Remove card"
              />
            </div>
            <ImageField label="Card image" value={card.image} onChange={(image) => set({ whyCards: replaceAt(home.whyCards, index, { ...card, image }) })} />
            <AdminGrid>
              <TextField label="Number" value={card.num} onChange={(num) => set({ whyCards: replaceAt(home.whyCards, index, { ...card, num }) })} />
              <TextField label="Tag" value={card.tag} onChange={(tag) => set({ whyCards: replaceAt(home.whyCards, index, { ...card, tag }) })} />
              <TextField label="Title" value={card.title} onChange={(title) => set({ whyCards: replaceAt(home.whyCards, index, { ...card, title }) })} />
              <TextField label="Image description (alt text)" value={card.alt} onChange={(alt) => set({ whyCards: replaceAt(home.whyCards, index, { ...card, alt }) })} />
            </AdminGrid>
            <TextAreaField label="Text" value={card.text} onChange={(text) => set({ whyCards: replaceAt(home.whyCards, index, { ...card, text }) })} />
          </div>
        ))}
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--small"
          onClick={() =>
            set({
              whyCards: [
                ...home.whyCards,
                { num: String(home.whyCards.length + 1).padStart(2, "0"), image: "", alt: "", title: "New card", text: "", tag: "" },
              ],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add card
        </button>
        <TextField label="Small link label on every card" value={home.whyCardCta} onChange={(whyCardCta) => set({ whyCardCta })} />
      </AdminSection>
    </>
  );
}

function MenuTab() {
  const { draft, actions } = useAdmin();
  const menu = draft.pages.menu;
  const set = (patch: Partial<typeof menu>) => actions.setPage("menu", patch);

  return (
    <>
      <AdminSection title="Menu hero">
        <ImageField label="Hero image" value={menu.heroImage} onChange={(heroImage) => set({ heroImage })} />
        <AdminGrid>
          <TextField label="Eyebrow" value={menu.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
          <TextField label="Heading line 1" value={menu.titleLine1} onChange={(titleLine1) => set({ titleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={menu.titleLine2} onChange={(titleLine2) => set({ titleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Intro paragraph" value={menu.text} onChange={(text) => set({ text })} />
      </AdminSection>

      <AdminSection title="Menu section">
        <AdminGrid>
          <TextField label="Eyebrow" value={menu.sectionEyebrow} onChange={(sectionEyebrow) => set({ sectionEyebrow })} />
          <TextField label="Heading" value={menu.sectionTitle} onChange={(sectionTitle) => set({ sectionTitle })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={menu.sectionText} onChange={(sectionText) => set({ sectionText })} />
        <AdminGrid>
          <TextField label="Line above the order link" value={menu.bottomHeading} onChange={(bottomHeading) => set({ bottomHeading })} />
          <TextField label="Link label" value={menu.bottomLinkLabel} onChange={(bottomLinkLabel) => set({ bottomLinkLabel })} />
        </AdminGrid>
        <p className="adm-note">The menu items themselves (names, prices, photos) are managed in the Products tab.</p>
      </AdminSection>
    </>
  );
}

function AboutTab() {
  const { draft, actions } = useAdmin();
  const about = draft.pages.about;
  const set = (patch: Partial<typeof about>) => actions.setPage("about", patch);

  return (
    <>
      <AdminSection title="About hero">
        <ImageField label="Hero image" value={about.heroImage} onChange={(heroImage) => set({ heroImage })} />
        <AdminGrid>
          <TextField label="Eyebrow" value={about.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
          <TextField label="Heading line 1" value={about.titleLine1} onChange={(titleLine1) => set({ titleLine1 })} />
          <TextField label="Heading line 2 (last word italic)" value={about.titleLine2} onChange={(titleLine2) => set({ titleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Intro paragraph" value={about.text} onChange={(text) => set({ text })} />
      </AdminSection>

      <AdminSection title="Team section">
        <AdminGrid>
          <TextField label="Eyebrow" value={about.teamEyebrow} onChange={(teamEyebrow) => set({ teamEyebrow })} />
          <TextField label="Heading line 1" value={about.teamTitleLine1} onChange={(teamTitleLine1) => set({ teamTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={about.teamTitleLine2} onChange={(teamTitleLine2) => set({ teamTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Side paragraph" value={about.teamAside} onChange={(teamAside) => set({ teamAside })} />
        <p className="adm-note">The team members themselves are managed in the Team tab.</p>
      </AdminSection>

      <AdminSection title="Why we do it">
        <AdminGrid>
          <TextField label="Eyebrow" value={about.whyEyebrow} onChange={(whyEyebrow) => set({ whyEyebrow })} />
          <TextField label="Heading line 1" value={about.whyTitleLine1} onChange={(whyTitleLine1) => set({ whyTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={about.whyTitleLine2} onChange={(whyTitleLine2) => set({ whyTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={about.whyText} onChange={(whyText) => set({ whyText })} />
        <TextField label="Button label below" value={about.whyCta} onChange={(whyCta) => set({ whyCta })} />

        {about.reasons.map((reason, index) => (
          <div className="adm-item" key={index}>
            <div className="adm-item-head">
              <strong>Reason {index + 1}</strong>
              <ListControls
                index={index}
                length={about.reasons.length}
                onMove={(direction) => set({ reasons: moveItem(about.reasons, index, direction) })}
                onRemove={() => set({ reasons: removeAt(about.reasons, index) })}
                removeLabel="Remove reason"
              />
            </div>
            <TextField label="Title" value={reason.title} onChange={(title) => set({ reasons: replaceAt(about.reasons, index, { ...reason, title }) })} />
            <TextAreaField label="Text" value={reason.text} onChange={(text) => set({ reasons: replaceAt(about.reasons, index, { ...reason, text }) })} />
          </div>
        ))}
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={() => set({ reasons: [...about.reasons, { title: "New reason", text: "" }] })}>
          <Plus size={15} aria-hidden="true" /> Add reason
        </button>
      </AdminSection>

      <AdminSection title="Menu lineup teaser">
        <AdminGrid>
          <TextField label="Eyebrow" value={about.lineupEyebrow} onChange={(lineupEyebrow) => set({ lineupEyebrow })} />
          <TextField label="Heading line 1" value={about.lineupTitleLine1} onChange={(lineupTitleLine1) => set({ lineupTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={about.lineupTitleLine2} onChange={(lineupTitleLine2) => set({ lineupTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={about.lineupText} onChange={(lineupText) => set({ lineupText })} />
        <TextField label="Button label below" value={about.lineupCta} onChange={(lineupCta) => set({ lineupCta })} />
      </AdminSection>
    </>
  );
}

function ContactTab() {
  const { draft, actions } = useAdmin();
  const contact = draft.pages.contact;
  const set = (patch: Partial<typeof contact>) => actions.setPage("contact", patch);

  return (
    <>
      <AdminSection title="Contact hero">
        <ImageField label="Hero image" value={contact.heroImage} onChange={(heroImage) => set({ heroImage })} />
        <AdminGrid>
          <TextField label="Eyebrow" value={contact.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
          <TextField label="Heading line 1" value={contact.titleLine1} onChange={(titleLine1) => set({ titleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={contact.titleLine2} onChange={(titleLine2) => set({ titleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Intro paragraph" value={contact.text} onChange={(text) => set({ text })} />
      </AdminSection>

      <AdminSection title="Get in touch block">
        <AdminGrid>
          <TextField label="Eyebrow" value={contact.introEyebrow} onChange={(introEyebrow) => set({ introEyebrow })} />
          <TextField label="Heading line 1" value={contact.introTitleLine1} onChange={(introTitleLine1) => set({ introTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={contact.introTitleLine2} onChange={(introTitleLine2) => set({ introTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={contact.introText} onChange={(introText) => set({ introText })} />
        <AdminGrid>
          <TextField label="WhatsApp button label" value={contact.whatsappCta} onChange={(whatsappCta) => set({ whatsappCta })} />
          <TextField label="Order hint text" value={contact.orderPrompt} onChange={(orderPrompt) => set({ orderPrompt })} />
        </AdminGrid>
        <TextField label="Order hint link label" value={contact.orderLinkLabel} onChange={(orderLinkLabel) => set({ orderLinkLabel })} />
        <AdminGrid>
          <TextField label="Location row title" value={contact.findTitle} onChange={(findTitle) => set({ findTitle })} />
          <TextField label="Hours row title" value={contact.hoursTitle} onChange={(hoursTitle) => set({ hoursTitle })} />
          <TextField label="Phone row title" value={contact.phoneTitle} onChange={(phoneTitle) => set({ phoneTitle })} />
        </AdminGrid>
        <p className="adm-note">The actual location, hours, phone number and social links are edited in the Site settings tab.</p>
      </AdminSection>

      <AdminSection title="Follow us block">
        <AdminGrid>
          <TextField label="Pill label" value={contact.socialEyebrow} onChange={(socialEyebrow) => set({ socialEyebrow })} />
          <TextField label="Heading line 1" value={contact.socialTitleLine1} onChange={(socialTitleLine1) => set({ socialTitleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={contact.socialTitleLine2} onChange={(socialTitleLine2) => set({ socialTitleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={contact.socialText} onChange={(socialText) => set({ socialText })} />
      </AdminSection>
    </>
  );
}

function OrderTab() {
  const { draft, actions } = useAdmin();
  const order = draft.pages.order;
  const set = (patch: Partial<typeof order>) => actions.setPage("order", patch);

  return (
    <>
      <AdminSection title="Order page intro">
        <AdminGrid>
          <TextField label="Eyebrow prefix" value={order.eyebrowPrefix} onChange={(eyebrowPrefix) => set({ eyebrowPrefix })} hint="The item count is added automatically." />
          <TextField label="Heading line 1" value={order.titleLine1} onChange={(titleLine1) => set({ titleLine1 })} />
          <TextField label="Heading line 2 (italic)" value={order.titleLine2} onChange={(titleLine2) => set({ titleLine2 })} />
        </AdminGrid>
        <TextAreaField label="Paragraph" value={order.text} onChange={(text) => set({ text })} />
        <AdminGrid>
          <TextField label="Bag list heading" value={order.itemsHeading} onChange={(itemsHeading) => set({ itemsHeading })} />
          <TextField label="Link back to the menu" value={order.addMoreLabel} onChange={(addMoreLabel) => set({ addMoreLabel })} />
        </AdminGrid>
      </AdminSection>

      <AdminSection title="Empty order message">
        <TextField label="Eyebrow" value={order.emptyEyebrow} onChange={(emptyEyebrow) => set({ emptyEyebrow })} />
        <TextField label="Heading" value={order.emptyTitle} onChange={(emptyTitle) => set({ emptyTitle })} />
        <TextAreaField label="Paragraph" value={order.emptyText} onChange={(emptyText) => set({ emptyText })} />
        <TextField label="Button label" value={order.emptyCta} onChange={(emptyCta) => set({ emptyCta })} />
      </AdminSection>

      <AdminSection title="Order summary (right side of the page)">
        <AdminGrid>
          <TextField label="Eyebrow" value={order.summaryEyebrow} onChange={(summaryEyebrow) => set({ summaryEyebrow })} />
          <TextField label="Heading" value={order.summaryTitle} onChange={(summaryTitle) => set({ summaryTitle })} />
        </AdminGrid>
        <TextField label="Message preview label" value={order.summaryPreviewLabel} onChange={(summaryPreviewLabel) => set({ summaryPreviewLabel })} />
        <TextAreaField
          label="Note about unset prices"
          value={order.summaryNote}
          onChange={(summaryNote) => set({ summaryNote })}
          hint="Only shown while a product has no price."
        />
        <TextAreaField label="Small print under the button" value={order.disclaimer} onChange={(disclaimer) => set({ disclaimer })} />
        <TextField label="Checkout button label" value={order.checkoutLabel} onChange={(checkoutLabel) => set({ checkoutLabel })} />
      </AdminSection>
    </>
  );
}

function ProductsTab() {
  const { draft, actions } = useAdmin();
  const products = draft.products;

  const update = (index: number, patch: Partial<Product>) =>
    actions.updateProducts((current) => replaceAt(current, index, { ...current[index], ...patch }));

  return (
    <AdminSection
      title="Products"
      description="Add, remove and edit everything that appears on the menu, home and about pages."
    >
      {products.length === 0 && <p className="adm-note">No products yet. Add your first one below.</p>}
      {products.map((product, index) => (
        <div className="adm-item" key={product.id}>
          <div className="adm-item-head">
            <strong>{product.name || "Untitled product"}</strong>
            <ListControls
              index={index}
              length={products.length}
              onMove={(direction) => actions.updateProducts((current) => moveItem(current, index, direction))}
              onRemove={() => {
                if (window.confirm(`Remove "${product.name}" from the site?`)) {
                  actions.updateProducts((current) => removeAt(current, index));
                }
              }}
              removeLabel={`Remove ${product.name}`}
            />
          </div>
          <AdminGrid>
            <TextField label="Name" value={product.name} onChange={(name) => update(index, { name })} />
            <TextField
              label="Price"
              type="number"
              value={product.price === null ? "" : String(product.price)}
              onChange={(value) => update(index, { price: value.trim() === "" ? null : Number(value) })}
              hint="Leave empty to show “To be confirmed”."
            />
          </AdminGrid>
          <TextAreaField label="Description" value={product.description} onChange={(description) => update(index, { description })} />
          <ImageField label="Product photo" value={product.image} onChange={(image) => update(index, { image })} />
          <TextField label="Photo description (alt text)" value={product.imageAlt} onChange={(imageAlt) => update(index, { imageAlt })} />
        </div>
      ))}
      <button
        type="button"
        className="adm-btn adm-btn--ghost"
        onClick={() =>
          actions.updateProducts((current) => [
            ...current,
            {
              id: newId("item"),
              name: "New product",
              description: "",
              image: "",
              imageAlt: "",
              price: null,
            },
          ])
        }
      >
        <Plus size={16} aria-hidden="true" /> Add product
      </button>
    </AdminSection>
  );
}

function TeamTab() {
  const { draft, actions } = useAdmin();
  const team = draft.team;

  const update = (index: number, patch: Partial<TeamMember>) =>
    actions.updateTeam((current) => replaceAt(current, index, { ...current[index], ...patch }));

  return (
    <AdminSection title="Team" description="The people shown on the About page.">
      {team.length === 0 && <p className="adm-note">No team members yet. Add one below.</p>}
      {team.map((person, index) => (
        <div className="adm-item" key={index}>
          <div className="adm-item-head">
            <strong>{person.name || "New team member"}</strong>
            <ListControls
              index={index}
              length={team.length}
              onMove={(direction) => actions.updateTeam((current) => moveItem(current, index, direction))}
              onRemove={() => actions.updateTeam((current) => removeAt(current, index))}
              removeLabel={`Remove ${person.name}`}
            />
          </div>
          <AdminGrid>
            <TextField label="Name" value={person.name} onChange={(name) => update(index, { name })} />
            <TextField label="Role" value={person.role} onChange={(role) => update(index, { role })} />
          </AdminGrid>
          <TextAreaField label="Quote" value={person.quote} onChange={(quote) => update(index, { quote })} />
          <TextAreaField label="Short bio" value={person.why} onChange={(why) => update(index, { why })} />
          <ImageField label="Photo" value={person.image} onChange={(image) => update(index, { image })} />
          <TextField label="Photo description (alt text)" value={person.imageAlt} onChange={(imageAlt) => update(index, { imageAlt })} />
        </div>
      ))}
      <button
        type="button"
        className="adm-btn adm-btn--ghost"
        onClick={() =>
          actions.updateTeam((current) => [...current, { name: "", role: "", quote: "", why: "", image: "", imageAlt: "" }])
        }
      >
        <Plus size={16} aria-hidden="true" /> Add team member
      </button>
    </AdminSection>
  );
}

/* ------------------------------------------------------------------ */
/* Pending review moderation                                           */
/* ------------------------------------------------------------------ */

/**
 * Moderation queue for reviews submitted from the website. Sourced from the
 * cross-device server queue (data/pending-reviews.json in the repo). Approve
 * adds the entry to the wall draft; only "Save & publish" makes it public
 * (and removes it from the queue). Reject deletes it outright.
 */
function PendingReviewPanel() {
  const { draft, actions } = useAdmin();
  const [items, setItems] = useState<PendingReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchPendingReviews();
      setItems(list);
      setError(null);
    } catch (caused) {
      setError(caused instanceof Error ? caused.message : "Could not load the pending reviews.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Reviews already added to the draft (approved here, or merged from elsewhere)
   * are hidden from the queue — a refreshed list must not show them twice.
   */
  const wallIds = new Set(draft.reviews.list.map((review) => review.id));

  function approve(pending: PendingReview) {
    actions.updateReviews((current) => ({
      ...current,
      list: [
        {
          id: pending.id,
          name: pending.name,
          email: pending.email,
          rating: pending.rating,
          text: pending.text,
          date: pending.date,
        },
        ...current.list,
      ],
    }));
    // Server cleanup waits for the content commit (see publish.ts) so a failed
    // publish can never lose the review.
    markPendingApproved(pending.id);
    setItems((current) => (current ?? []).filter((item) => item.id !== pending.id));
    setNote(`Added ${pending.name}'s review to the wall draft — click Save & publish in the top bar to make it live.`);
  }

  async function reject(pending: PendingReview) {
    if (!window.confirm(`Reject and delete ${pending.name}'s review? This cannot be undone.`)) return;
    setBusyId(pending.id);
    try {
      await deletePendingReview(pending.id);
      setItems((current) => (current ?? []).filter((item) => item.id !== pending.id));
      setNote("Review rejected and deleted.");
      setError(null);
    } catch (caused) {
      setError(caused instanceof Error ? caused.message : "Could not delete that review — try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminSection
      title="Pending reviews"
      description="Review submissions from the website, one queue across all devices. Approve adds the review to the wall draft (then Save & publish makes it public); Reject deletes it."
    >
      {error && <p className="adm-note adm-note--warn">{error}</p>}
      {note && <p className="adm-note">{note}</p>}
      {items === null && !error && <p className="adm-note">Loading pending reviews…</p>}
      {items !== null && items.length === 0 && <p className="adm-note">No pending reviews right now.</p>}
      {items
        ?.filter((item) => !wallIds.has(item.id))
        .map((pending) => (
          <div className="adm-item adm-pending" key={pending.id}>
            <div className="adm-item-head">
              <strong>{pending.name}</strong>
              <span className="adm-pending-meta" aria-label={`Rated ${pending.rating} out of 5`}>
                {"★".repeat(pending.rating)}
                {"☆".repeat(5 - pending.rating)}
              </span>
              <div className="adm-actions-row">
                <button
                  type="button"
                  className="adm-btn adm-btn--small"
                  disabled={busyId === pending.id}
                  onClick={() => approve(pending)}
                >
                  <CheckCircle2 size={14} aria-hidden="true" /> Approve
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--small adm-btn--danger"
                  disabled={busyId === pending.id}
                  onClick={() => void reject(pending)}
                >
                  <Trash2 size={14} aria-hidden="true" /> Reject
                </button>
              </div>
            </div>
            <p className="adm-pending-text">{pending.text}</p>
            <p className="adm-pending-meta">
              {pending.email} · {new Date(pending.date).toLocaleString()}
            </p>
          </div>
        ))}
    </AdminSection>
  );
}

function ReviewsTab() {
  const { draft, actions } = useAdmin();
  const reviews = draft.reviews;
  const update = (index: number, patch: Partial<Review>) =>
    actions.updateReviews((current) => ({
      ...current,
      list: current.list.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));

  return (
    <>
      <PendingReviewPanel />
      <AdminSection title="Reviews page">
        <AdminGrid>
          <TextField label="Eyebrow" value={reviews.heroEyebrow} onChange={(heroEyebrow) => actions.updateReviews((current) => ({ ...current, heroEyebrow }))} />
          <TextField label="Heading line 1" value={reviews.heroTitleLine1} onChange={(heroTitleLine1) => actions.updateReviews((current) => ({ ...current, heroTitleLine1 }))} />
          <TextField label="Heading line 2 (italic)" value={reviews.heroTitleLine2} onChange={(heroTitleLine2) => actions.updateReviews((current) => ({ ...current, heroTitleLine2 }))} />
          <ImageField label="Hero background image" value={reviews.heroImage} onChange={(heroImage) => actions.updateReviews((current) => ({ ...current, heroImage }))} />
        </AdminGrid>
        <TextAreaField label="Intro paragraph" value={reviews.heroText} onChange={(heroText) => actions.updateReviews((current) => ({ ...current, heroText }))} />
      </AdminSection>

      <AdminSection title="Review form" description="The labels and messages of the form visitors use to leave reviews.">
        <AdminGrid>
          <TextField label="Form heading" value={reviews.formHeading} onChange={(formHeading) => actions.updateReviews((current) => ({ ...current, formHeading }))} />
        </AdminGrid>
        <TextAreaField label="Form intro text" value={reviews.formText} onChange={(formText) => actions.updateReviews((current) => ({ ...current, formText }))} />
        <AdminGrid>
          <TextField label="Name placeholder" value={reviews.namePlaceholder} onChange={(namePlaceholder) => actions.updateReviews((current) => ({ ...current, namePlaceholder }))} />
          <TextField label="Email placeholder" value={reviews.emailPlaceholder} onChange={(emailPlaceholder) => actions.updateReviews((current) => ({ ...current, emailPlaceholder }))} />
          <TextField label="Review placeholder" value={reviews.reviewPlaceholder} onChange={(reviewPlaceholder) => actions.updateReviews((current) => ({ ...current, reviewPlaceholder }))} />
        </AdminGrid>
        <AdminGrid>
          <TextField label="Submit button label" value={reviews.submitLabel} onChange={(submitLabel) => actions.updateReviews((current) => ({ ...current, submitLabel }))} />
          <TextField label="Success message" value={reviews.successNote} onChange={(successNote) => actions.updateReviews((current) => ({ ...current, successNote }))} />
        </AdminGrid>
      </AdminSection>

      <AdminSection
        title="Review wall"
        description="Reviews left by visitors appear here automatically (newest first). You can edit, reorder, remove them, or add your own."
      >
        {reviews.list.length === 0 && <p className="adm-note">No reviews yet. Add one below.</p>}
        {reviews.list.map((review, index) => (
          <div className="adm-item" key={review.id}>
            <div className="adm-item-head">
              <strong>{review.name || "New review"}</strong>
              <ListControls
                index={index}
                length={reviews.list.length}
                onMove={(direction) =>
                  actions.updateReviews((current) => ({ ...current, list: moveItem(current.list, index, direction) }))
                }
                onRemove={() => actions.updateReviews((current) => ({ ...current, list: removeAt(current.list, index) }))}
                removeLabel={`Remove ${review.name}`}
              />
            </div>
            <AdminGrid>
              <TextField label="Name" value={review.name} onChange={(name) => update(index, { name })} />
              <TextField label="Email (not shown publicly)" value={review.email || ""} onChange={(email) => update(index, { email })} />
              <TextField
                label="Rating (1–5)"
                type="number"
                value={String(review.rating)}
                onChange={(value) => update(index, { rating: Math.max(1, Math.min(5, Math.round(Number(value) || 1))) })}
              />
            </AdminGrid>
            <TextAreaField label="Review text" value={review.text} onChange={(text) => update(index, { text })} />
          </div>
        ))}
        <button
          type="button"
          className="adm-btn adm-btn--ghost"
          onClick={() =>
            actions.updateReviews((current) => ({
              ...current,
              list: [
                {
                  id: newId("review"),
                  name: "",
                  email: "",
                  rating: 5,
                  text: "",
                },
                ...current.list,
              ],
            }))
          }
        >
          <Plus size={16} aria-hidden="true" /> Add review on top
        </button>
      </AdminSection>
    </>
  );
}

function SettingsTab({
  onExport,
  onImport,
  onReset,
  onSync,
  importRef,
}: {
  onExport: () => void;
  onImport: (file: File | undefined) => void;
  onReset: () => void;
  onSync: () => void;
  importRef: RefObject<HTMLInputElement | null>;
}) {
  const { draft, actions } = useAdmin();
  const site = draft.site;
  const shared = draft.pages.shared;

  return (
    <>
      <AdminSection title="Brand">
        <ImageField
          label="Logo"
          value={site.logoSrc}
          onChange={(logoSrc) => actions.setSite({ logoSrc })}
          hint="Shown in the header, footer and admin login. Leave empty to fall back to the text wordmark."
        />
        <TextField label="Site name" value={site.name} onChange={(name) => actions.setSite({ name })} />
        <TextField label="Currency symbol" value={site.currencyLabel} onChange={(currencyLabel) => actions.setSite({ currencyLabel })} />
      </AdminSection>

      <AdminSection title="Contact details">
        <AdminGrid>
          <TextField
            label="WhatsApp number"
            value={site.whatsappNumber}
            onChange={(whatsappNumber) => actions.setSite({ whatsappNumber })}
            hint="Digits with country code, e.g. 8801XXXXXXXXX."
          />
          <TextField label="Phone number" value={site.phoneNumber} onChange={(phoneNumber) => actions.setSite({ phoneNumber })} />
          <TextField label="Location" value={site.location} onChange={(location) => actions.setSite({ location })} />
          <TextField label="Opening hours" value={site.openingHours} onChange={(openingHours) => actions.setSite({ openingHours })} />
        </AdminGrid>
        <AdminGrid>
          <TextField label="Instagram URL" value={site.socials.instagram} onChange={(instagram) => actions.setSite({ socials: { ...site.socials, instagram } })} />
          <TextField label="Facebook URL" value={site.socials.facebook} onChange={(facebook) => actions.setSite({ socials: { ...site.socials, facebook } })} />
          <TextField label="TikTok URL" value={site.socials.tiktok} onChange={(tiktok) => actions.setSite({ socials: { ...site.socials, tiktok } })} />
        </AdminGrid>
      </AdminSection>

      <AdminSection title="Footer">
        <TextAreaField label="Logo tagline" value={shared.footerTagline} onChange={(footerTagline) => actions.setPage("shared", { footerTagline })} />
        <AdminGrid>
          <TextField label="Ticker text (plain)" value={shared.footerHeadingLine1} onChange={(footerHeadingLine1) => actions.setPage("shared", { footerHeadingLine1 })} />
          <TextField label="Ticker text (italic)" value={shared.footerHeadingLine2} onChange={(footerHeadingLine2) => actions.setPage("shared", { footerHeadingLine2 })} />
        </AdminGrid>
        <AdminGrid>
          <TextField label="Left column label" value={shared.footerExploreLabel} onChange={(footerExploreLabel) => actions.setPage("shared", { footerExploreLabel })} />
          <TextField label="Right column label" value={shared.footerHelloLabel} onChange={(footerHelloLabel) => actions.setPage("shared", { footerHelloLabel })} />
          <TextField label="Line at the very bottom" value={shared.footerBottomLine} onChange={(footerBottomLine) => actions.setPage("shared", { footerBottomLine })} />
        </AdminGrid>
        <p className="adm-note">Footer links (Home / Menu / About / Contact / WhatsApp / Your order) follow the site navigation and stay as they are. The big outlined wordmark at the bottom uses your site name automatically.</p>
      </AdminSection>

      <AdminSection title="Publishing" description="Edits stay in this browser until you click “Save & publish” — then everything goes to the GitHub repository in a single commit, and Vercel rebuilds the live site (every browser sees it in 1-2 minutes).">
        <div className="adm-danger-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onSync}>
            <Upload size={16} aria-hidden="true" /> Sync everything to the live site
          </button>
        </div>
        <p className="adm-note">Re-syncs this browser's whole content store to GitHub. Handy after importing a backup, or to recover from a publish failure on an older tab.</p>
      </AdminSection>

      <AdminSection title="Backup" description="Export your content, or restore it on another device.">
        <div className="adm-danger-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onExport}>
            <Download size={16} aria-hidden="true" /> Export content
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => importRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Import content
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="adm-hidden"
            onChange={(event) => onImport(event.target.files?.[0])}
          />
        </div>
      </AdminSection>

      <AdminSection title="Reset" description="Danger zone — this cannot be undone.">
        <div className="adm-danger-actions">
          <button type="button" className="adm-btn adm-btn--danger" onClick={onReset}>
            <RotateCcw size={16} aria-hidden="true" /> Reset all content to defaults
          </button>
        </div>
      </AdminSection>
    </>
  );
}
