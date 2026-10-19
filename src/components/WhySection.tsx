import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, LayoutGrid, Send, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext";
import { Reveal } from "./PageElements";

const cardIcons = [LayoutGrid, Store, Send, LayoutGrid, Store, Send];

export function WhySection() {
  const reduceMotion = useReducedMotion();
  const still = reduceMotion ?? false;
  const { content } = useContent();
  const home = content.pages.home;
  const cards = home.whyCards;

  return (
    <section className="why2 section-cream" aria-labelledby="why-title">
      <div className="site-container">
        <div className="why2-head">
          <Reveal>
            <span className="eyebrow eyebrow--orange">{home.whyEyebrow}</span>
            <h2 id="why-title">{home.whyTitleLine1}<br /><em>{home.whyTitleLine2}</em></h2>
          </Reveal>
          <Reveal className="why2-head-aside" delay={0.1}>
            <p>{home.whyAside}</p>
            <Link to="/menu" className="text-link text-link--dark">{home.whyLinkLabel} <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </Reveal>
        </div>

        <div className="why2-grid">
          {cards.map((card, i) => (
            <motion.article
              key={`${card.num}-${i}`}
              className="why2-card"
              initial={still ? false : { opacity: 0, y: 44 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="why2-media">
                <img src={card.image} alt={card.alt} loading="lazy" decoding="async" />
                <span className="why2-num">{card.num}</span>
                <span className="why2-tag">{card.tag}</span>
              </div>
              <div className="why2-body">
                <span className="why2-icon">{(() => { const Icon = cardIcons[i % cardIcons.length]; return <Icon size={22} strokeWidth={1.9} aria-hidden="true" />; })()}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <Link to="/menu" className="why2-link" aria-label={`${card.title} — explore the menu`}>
                  {home.whyCardCta} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}
