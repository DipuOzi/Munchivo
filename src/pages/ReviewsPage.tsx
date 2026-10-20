import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Sparkles, Star } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Reveal } from "../components/PageElements";
import { submitReview } from "../reviewApi";
import type { Review } from "../content/defaults";

function Stars({ rating, size = 17 }: { rating: number; size?: number }) {
  return (
    <span className="rvw-stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          size={size}
          strokeWidth={0}
          aria-hidden="true"
          className={step <= rating ? "rvw-star--on" : "rvw-star--off"}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const reduceMotion = useReducedMotion();
  const still = reduceMotion ?? false;
  const initial = review.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.article
      className={`rvw-card${review.rating === 5 ? " rvw-card--top" : ""}`}
      initial={still ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay: (index % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <Stars rating={review.rating} />
      <p className="rvw-text">{review.text}</p>
      <div className="rvw-meta">
        <span className="rvw-avatar" aria-hidden="true">{initial}</span>
        <span className="rvw-person">
          <strong>{review.name}</strong>
        </span>
      </div>
    </motion.article>
  );
}

function ReviewForm() {
  const { content } = useContent();
  const reviews = content.reviews;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Write your name (at least 2 characters) so people know who said it.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Add a valid email — e.g. you@example.com. It is never shown on the wall.");
      return;
    }
    if (text.trim().length < 10) {
      setError("Tell a little more — at least 10 characters.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Goes to the server's pending queue — visible to the admin on any
      // device, and public once approved. Nothing touches localStorage.
      await submitReview({
        name: name.trim(),
        email: email.trim(),
        rating,
        text: text.trim(),
      });
      setName("");
      setEmail("");
      setRating(5);
      setText("");
      setPosted(true);
      window.setTimeout(() => setPosted(false), 5000);
    } catch (caused) {
      const message = caused instanceof Error ? caused.message : "";
      if (/queue is full|hold on/i.test(message)) {
        setError("The review queue is warming up — please try again in a little while.");
      } else {
        setError("Could not send your review right now — please try again in a moment.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rvw-form-card">
      <h2 id="rvw-post-title" className="rvw-form-heading">{reviews.formHeading.split("?")[0]}<em>{reviews.formHeading.includes("?") ? "?" : ""}</em></h2>
      <p className="rvw-form-sub">{reviews.formText}</p>

      <form className="rvw-form" onSubmit={handleSubmit} noValidate>
        <div className="rvw-form-row">
          <label className="rvw-field">
            <span>Your name</span>
            <input
              className="rvw-input"
              type="text"
              value={name}
              placeholder={reviews.namePlaceholder}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="rvw-field">
            <span>Your email</span>
            <input
              className="rvw-input"
              type="email"
              value={email}
              placeholder={reviews.emailPlaceholder}
              maxLength={80}
              onChange={(event) => setEmail(event.target.value)}
            />
            <small className="rvw-field-note">Never shown on the wall — only for our records.</small>
          </label>
        </div>

        <div className="rvw-field">
          <span id="rvw-rating-label">Your rating</span>
          <div className="rvw-rate" role="radiogroup" aria-labelledby="rvw-rating-label">
            {[1, 2, 3, 4, 5].map((step) => (
              <button
                key={step}
                type="button"
                role="radio"
                aria-checked={rating === step}
                aria-label={`${step} star${step === 1 ? "" : "s"}`}
                className="rvw-rate-btn"
                onClick={() => setRating(step)}
              >
                <Star
                  size={26}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className={step <= rating ? "rvw-star--on" : "rvw-star--off"}
                  fill={step <= rating ? "currentColor" : "none"}
                />
              </button>
            ))}
            <span className="rvw-rate-value" aria-hidden="true">{rating}/5</span>
          </div>
        </div>

        <label className="rvw-field">
          <span>Your review</span>
          <textarea
            className="rvw-input rvw-textarea"
            rows={4}
            value={text}
            placeholder={reviews.reviewPlaceholder}
            maxLength={600}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        {error && <p className="rvw-error" role="alert">{error}</p>}

        <div className="rvw-form-foot">
          <button type="submit" className="button button--dark" disabled={sending}>
            {sending ? "Sending…" : reviews.submitLabel}
          </button>
          {posted && (
            <p className="rvw-success" role="status">
              <CheckCircle2 size={17} aria-hidden="true" /> {reviews.successNote}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

/** Average rating + review count + star distribution, shown as a strip above the form. */
function ReviewStats({ list }: { list: Review[] }) {
  const count = list.length;
  if (!count) return null; // nothing to summarise yet — keep the band clean
  const average = list.reduce((sum, review) => sum + review.rating, 0) / count;
  const rows = [5, 4, 3, 2, 1].map((stars) => {
    const n = list.filter((review) => review.rating === stars).length;
    return { stars, n, pct: Math.round((n / count) * 100) };
  });
  return (
    <aside className="rvw-stats" aria-label="Review summary">
      <div className="rvw-stats-summary">
        <span className="rvw-stats-eyebrow">AT A GLANCE</span>
        <div className="rvw-stats-score" role="img" aria-label={`Average rating ${average.toFixed(1)} out of 5`}>
          <span className="rvw-stats-number">{average.toFixed(1)}</span>
          <span className="rvw-stats-of">out of 5</span>
        </div>
        <Stars rating={Math.round(average)} size={18} />
        <p className="rvw-stats-count">
          {count} customer review{count === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="rvw-stats-bars">
        {rows.map(({ stars, n, pct }) => (
          <li key={stars} aria-label={`${n} of ${count} reviews rated ${stars} star${stars === 1 ? "" : "s"}`}>
            <span className="rvw-stats-star" aria-hidden="true">{stars}★</span>
            <span className="rvw-stats-track" aria-hidden="true">
              <span className="rvw-stats-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="rvw-stats-num" aria-hidden="true">{n}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function ReviewsPage() {
  const { content } = useContent();
  const reviews = content.reviews;
  const [visibleCount, setVisibleCount] = useState(12);
  const listed = reviews.list.slice(0, visibleCount);
  const remaining = reviews.list.length - visibleCount;

  return (
    <>
      <section className="inner-hero inner-hero--reviews" aria-labelledby="reviews-hero-title">
        <img className="inner-hero-image" src={reviews.heroImage} alt="" aria-hidden="true" />
        <div className="inner-hero-shade" />
        <div className="site-container inner-hero-content">
          <span className="eyebrow eyebrow--orange">{reviews.heroEyebrow}</span>
          <h1 id="reviews-hero-title">{reviews.heroTitleLine1}<br /><em>{reviews.heroTitleLine2}</em></h1>
          <p>{reviews.heroText}</p>
        </div>
      </section>

      <section className="reviews-wall section-cream" aria-labelledby="reviews-wall-title">
        <div className="site-container">
          <div className="section-heading">
            <Reveal>
              <span className="eyebrow eyebrow--orange">THE REVIEW WALL</span>
              <h2 id="reviews-wall-title">{reviews.list.length} review{reviews.list.length === 1 ? "" : "s"} and <em>counting.</em></h2>
            </Reveal>
          </div>
          <div className="rvw-grid">
            {listed.map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
          {remaining > 0 && (
            <button type="button" className="rvw-more" onClick={() => setVisibleCount((count) => count + 12)}>
              Load more reviews
              <span className="rvw-more-count">{remaining} more</span>
            </button>
          )}
          <Reveal delay={0.06}>
            <ReviewStats list={reviews.list} />
          </Reveal>
        </div>
      </section>

      <section className="rvw-post" aria-labelledby="rvw-post-title">
        <div className="site-container" id="leave-a-review">
          <Reveal>
            <span className="social-pill"><Sparkles size={13} aria-hidden="true" /> YOUR TURN</span>
          </Reveal>
          <Reveal delay={0.08}>
            <ReviewForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
