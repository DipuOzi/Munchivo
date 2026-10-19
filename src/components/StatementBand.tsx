import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useOrderIntent } from "../hooks/useOrderIntent";
import { useContent } from "../context/ContentContext";

const line = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: "0%",
    transition: { duration: 0.85, delay: 0.05 + i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function StatementBand() {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const still = reduceMotion ?? false;
  const orderIntent = useOrderIntent();
  const { content } = useContent();
  const home = content.pages.home;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const mainImgY = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const sideY = useTransform(scrollYProgress, [0, 1], [70, -70]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 90]);

  const burger = content.products.find((p) => p.id === "mini-burger") ?? content.products[0];
  const shake = content.products.find((p) => p.id === "milkshake") ?? content.products[1] ?? content.products[0];

  return (
    <section ref={ref} className="sb" aria-labelledby="statement-title">
      <div className="sb-bg" aria-hidden="true" />
      <div className="sb-dots" aria-hidden="true" />

      <div className="site-container sb-grid">
        <div className="sb-copy">
          <span className="sb-pill"><Flame size={13} aria-hidden="true" /> {home.statementPill}</span>

          <h2 id="statement-title" className="sb-title">
            <span className="sb-mask"><motion.span variants={line} initial={still ? false : "hidden"} whileInView="show" viewport={{ once: true, amount: 0.5 }} custom={0}>{home.statementLine1}</motion.span></span>
            <span className="sb-mask"><motion.span variants={line} initial={still ? false : "hidden"} whileInView="show" viewport={{ once: true, amount: 0.5 }} custom={1}>{home.statementLine2}</motion.span></span>
            <span className="sb-mask"><motion.span variants={line} initial={still ? false : "hidden"} whileInView="show" viewport={{ once: true, amount: 0.5 }} custom={2}><em>{home.statementLine3}</em></motion.span></span>
          </h2>

          <p className="sb-sub">{home.statementText}</p>

          <div className="sb-actions">
            <Link to="/menu" className="button button--dark">Find your favorite <ArrowUpRight size={19} aria-hidden="true" /></Link>
            <button type="button" className="sb-wa" onClick={orderIntent}>
              Order on WhatsApp <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          </div>

          <dl className="sb-stats">
            {home.statementStats.map((stat) => (
              <div key={stat.label}><dt>{stat.value}</dt><dd>{stat.label}</dd></div>
            ))}
          </dl>
        </div>

        <div className="sb-visual">
          <motion.div className="sb-ring" style={{ rotate: still ? 0 : ringRotate }} aria-hidden="true">
            <svg viewBox="0 0 400 400">
              <circle cx="200" cy="200" r="196" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 10" />
            </svg>
          </motion.div>

          <figure className="sb-card sb-card--main">
            <div className="sb-card-media">
              <motion.img src={burger?.image} alt={burger?.imageAlt} loading="lazy" decoding="async" style={{ y: still ? 0 : mainImgY }} />
            </div>
            <figcaption>
              <strong>{burger?.name}</strong>
              <span>{home.statementCardOneCaption}</span>
            </figcaption>
          </figure>

          <motion.figure className="sb-card sb-card--side" style={{ y: still ? 0 : sideY }}>
            <div className="sb-card-media">
              <img src={shake?.image} alt={shake?.imageAlt} loading="lazy" decoding="async" />
            </div>
            <figcaption>
              <strong>{shake?.name}</strong>
              <span>{home.statementCardTwoCaption}</span>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
