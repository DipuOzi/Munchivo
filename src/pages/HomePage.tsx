import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext";
import { ProductCard } from "../components/ProductCard";
import { ExperienceSection } from "../components/ExperienceSection";
import { StatementBand } from "../components/StatementBand";
import { WhySection } from "../components/WhySection";
import { Reveal } from "../components/PageElements";

export function HomePage() {
  const { content } = useContent();
  const home = content.pages.home;
  const products = content.products;
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const heroImageY = useTransform(scrollY, [0, 900], [0, 26]);
  const heroAnimation = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.85, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  // A card hand below + a single raised card on top. Catalog poses live in CSS
  // (data-slot / data-top custom properties with transitions — they can never stall;
  // framer only adds the gentle page parallax on the container).
  const fanRef = useRef<HTMLDivElement | null>(null);
  const [lift, setLift] = useState(330);
  const [topScale, setTopScale] = useState(1.7);
  const [spread, setSpread] = useState(1);

  // Measure once per resize: pin the selected card just above the hand (small,
  // airy gap instead of a big empty band) and grow it as far as the column allows.
  useEffect(() => {
    const measure = () => {
      const fan = fanRef.current;
      const topCard = fan?.querySelector<HTMLElement>(".hero-card[data-top]");
      const handCard = fan?.querySelector<HTMLElement>(".hero-card:not([data-top])");
      if (!fan || !topCard || !handCard) return;
      const phone = window.matchMedia("(max-width: 700px)").matches;
      const topH = topCard.offsetHeight;  // top card is a touch wider-ratio when selected
      const handH = handCard.offsetHeight;
      const fanH = fan.clientHeight;
      const handTop = handH * 1.02 + 26;  // top of the hand, from its base (tilt-aware)
      const gap = phone ? 30 : 58;        // airy space between card and hand
      const headroom = 14;                // clearance at the column top
      // Grow the top card only until it would collide with the hand or the column top.
      const maxScale = Math.max(1, (fanH - headroom - handTop - gap) / topH);
      const scale = Math.min(1.7, maxScale);
      const targetBottom = Math.min(handTop + gap, fanH - headroom - topH * scale);
      setLift(Math.max(targetBottom - 34, 60));
      setTopScale(scale);
      setSpread(Math.min(1, fan.clientWidth / 500));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const fanCards = products.slice(0, 6);
  const FAN_LANES = 4; // slots 1-5 (lanes 0-4)

  // Slot map: index 0 = the ONE card on top; 1-5 = the hand below.
  // Selecting a card swaps its slot with the top slot — nothing else ever moves.
  const [slots, setSlots] = useState<string[]>(() => {
    const list = fanCards.map((p) => p.id);
    return list[1] ? [list[1], ...list.filter((id) => id !== list[1])] : list;
  });

  const selectCard = (id: string) => {
    setSlots((prev) => (prev[0] === id ? prev : prev.map((s, i) => (i === 0 ? id : s === id ? prev[0] : s))));
  };

  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-dots" aria-hidden="true" />
        <div className="site-container home-hero-inner">
          <div className="hero-content">
            <motion.span className="hero-kicker" {...heroAnimation(0.02)}>
              <span className="hero-kicker-dot" aria-hidden="true" />
              {home.heroKicker}
            </motion.span>
            <motion.h1 id="home-title" className="hero-brand-title" {...heroAnimation(0.09)}>
              {home.heroTitle.replace(/\.$/, "")}<span>.</span>
            </motion.h1>
            <motion.p className="hero-tagline" {...heroAnimation(0.16)}>
              {home.heroHeadingLine1} {home.heroHeadingLine2}
            </motion.p>
            <motion.p className="hero-lede" {...heroAnimation(0.28)}>{home.heroText}</motion.p>
            <motion.div className="button-group hero-buttons" {...heroAnimation(0.36)}>
              <Link to="/menu" className="button button--orange">{home.heroPrimaryCta} <ArrowUpRight size={19} aria-hidden="true" /></Link>
              <a
                href="#signature"
                className="text-link text-link--dark"
                onClick={(e) => {
                  e.preventDefault();
                  const win = window as unknown as { __lenis?: { scrollTo: (target: string, opts?: { offset: number }) => void } };
                  if (win.__lenis) {
                    win.__lenis.scrollTo("#signature", { offset: -90 });
                  } else {
                    document.getElementById("signature")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                {home.heroSecondaryCta} <ArrowDownRight size={19} aria-hidden="true" />
              </a>
            </motion.div>
            <motion.p className="hero-trust" {...heroAnimation(0.44)}>
              {home.heroTrust}
            </motion.p>
          </div>
          <motion.div
            ref={fanRef}
            className="hero-fan"
            style={{ y: reduceMotion ? 0 : heroImageY, "--fs": spread } as CSSProperties}
            aria-label="Favorites from the cart — click a card to bring it on top"
          >
            {/* Fixed DOM order; each card only changes its data-slot / data-top pose. */}
            {fanCards.map((product, index) => {
              const pos = slots.indexOf(product.id);
              const isTop = pos === 0;
              return (
                <figure
                  key={product.id}
                  className={`hero-card${isTop ? " hero-card--top" : ""}`}
                  data-top={isTop ? "" : undefined}
                  data-slot={isTop ? undefined : String(Math.max(0, Math.min(pos - 1, FAN_LANES)))}
                  style={{
                    "--d": isTop ? "0.05s" : `${(0.38 + index * 0.06).toFixed(2)}s`,
                    "--raise": isTop ? `${-lift}px` : "0px",
                    ...(isTop ? { "--s": String(topScale) } : {}),
                  } as CSSProperties}
                  role="button"
                  tabIndex={0}
                  aria-label={isTop ? product.name : `Bring ${product.name} on top`}
                  onClick={() => selectCard(product.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectCard(product.id);
                    }
                  }}
                >
                  <div className="hero-card-in">
                    <img src={product.image} alt={product.imageAlt} loading="eager" decoding="async" />
                    <span className="hero-card-cap">
                      <span>{product.name}</span>
                    </span>
                  </div>
                </figure>
              );
            })}
            <motion.div className="hero-arrow" {...heroAnimation(0.95)} aria-hidden="true">
              <img src="/hero-arrow.png" alt="" draggable={false} />
              <span>{home.heroFanLabel}</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="signature" className="signature-section" aria-labelledby="signature-title">
        <div className="site-container">
          <div className="section-heading section-heading--split">
            <Reveal>
              <span className="eyebrow eyebrow--orange">{home.signatureEyebrow}</span>
              <h2 id="signature-title">{home.signatureTitleLine1}<br /><em>{home.signatureTitleLine2}</em></h2>
            </Reveal>
            <Reveal className="section-heading-aside" delay={0.1}>
              <p>{home.signatureAside}</p>
              <Link to="/menu" className="text-link text-link--dark">{home.signatureLinkLabel} <ArrowUpRight size={18} aria-hidden="true" /></Link>
            </Reveal>
          </div>
          <div className="product-grid">
            {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
          </div>
        </div>
      </section>

      <ExperienceSection />

      <StatementBand />

      <WhySection />

    </>
  );
}