import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Sparkles, Star } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Reveal } from "../components/PageElements";
import type { Review } from "../content/defaults";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="rvw-stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          size={17}
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
  const { content, addReview } = useContent();
  const reviews = content.reviews;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  function handleSubmit(event: FormEvent) {
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
    addReview({
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
          <button type="submit" className="button button--dark">{reviews.submitLabel}</button>
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
