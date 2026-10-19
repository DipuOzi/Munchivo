import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext";
import { Reveal } from "./PageElements";

export function ExperienceSection() {
  const { content } = useContent();
  const { products } = content;
  const home = content.pages.home;
  const steps = home.steps;
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Each layer moves at its own speed to build depth.
  const mainY = useTransform(scrollYProgress, [0, 1], [-50, 50]);
  const cardOneY = useTransform(scrollYProgress, [0, 1], [110, -110]);
  const cardTwoY = useTransform(scrollYProgress, [0, 1], [60, -150]);
  const badgeRotate = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const marqueeX = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  const still = reduceMotion ?? false;
  const names = [...products, ...products, ...products];

  return (
    <section ref={ref} className="xp" aria-labelledby="experience-title">
      <div className="xp-glow" aria-hidden="true" />
      <div className="site-container xp-grid">
        <div className="xp-visual">
          <motion.div
            className="xp-main"
            initial={still ? false : { clipPath: "inset(12% 12% 12% 12% round 220px 220px 24px 24px)" }}
            whileInView={{ clipPath: "inset(0% 0% 0% 0% round 220px 220px 24px 24px)" }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.img
              src={home.experienceImage}
              alt={home.experienceImageAlt}
              loading="lazy"
              decoding="async"
              style={{ y: still ? 0 : mainY }}
            />
          </motion.div>

          <motion.figure className="xp-card xp-card--one" style={{ y: still ? 0 : cardOneY }}>
            <img src={home.experienceCardOneImage} alt="" loading="lazy" decoding="async" />
            <figcaption>{products[2]?.name ?? products[0]?.name}</figcaption>
          </motion.figure>

          <motion.figure className="xp-card xp-card--two" style={{ y: still ? 0 : cardTwoY }}>
            <img src={home.experienceCardTwoImage} alt="" loading="lazy" decoding="async" />
            <figcaption>{products[3]?.name ?? products[1]?.name}</figcaption>
          </motion.figure>

          <motion.div className="xp-badge" style={{ rotate: still ? 0 : badgeRotate }} aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <defs>
                <path id="xpCircle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
              </defs>
              <text>
                <textPath href="#xpCircle">MUNCHIVO • STREET FOOD • ON THE GO • </textPath>
              </text>
            </svg>
            <span className="xp-badge-core">M</span>
          </motion.div>
        </div>

        <div className="xp-copy">
          <Reveal>
            <span className="eyebrow">{home.experienceEyebrow}</span>
            <h2 id="experience-title">{home.experienceTitleLine1}<br /><em>{home.experienceTitleLine2}</em></h2>
            <p>{home.experienceText}</p>
          </Reveal>

          <ol className="xp-steps">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={0.08 + index * 0.1}>
                <li className="xp-step">
                  <span className="xp-step-num">0{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.35} className="xp-actions">
            <Link to="/menu" className="button button--orange">Start your order <ArrowUpRight size={19} aria-hidden="true" /></Link>
            <Link to="/about" className="text-link text-link--light">Get to know Munchivo <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </Reveal>
        </div>
      </div>

      <div className="xp-marquee" aria-hidden="true">
        <motion.div className="xp-marquee-track" style={{ x: still ? 0 : marqueeX }}>
          {names.map((product, index) => (
            <span key={`${product.id}-${index}`}>
              {product.name}<i>✺</i>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
