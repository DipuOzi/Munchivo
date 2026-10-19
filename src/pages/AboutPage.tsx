import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "../components/PageElements";
import { useContent } from "../context/ContentContext";

export function AboutPage() {
  const { content } = useContent();
  const about = content.pages.about;
  const products = content.products;
  const team = content.team;
  const reasons = about.reasons;
  const [lineupFirstWord, ...lineupRest] = about.titleLine2.split(" ");

  return (
    <>
      <section className="inner-hero inner-hero--about" aria-labelledby="about-title">
        <img className="inner-hero-image" src={about.heroImage} alt="" aria-hidden="true" />
        <div className="inner-hero-shade" />
        <div className="site-container inner-hero-content">
          <span className="eyebrow eyebrow--orange">{about.eyebrow}</span>
          <h1 id="about-title">{about.titleLine1}<br />{lineupFirstWord} <em>{lineupRest.join(" ")}</em></h1>
          <p>{about.text}</p>
        </div>
      </section>

      <section className="about-people section-cream" aria-labelledby="people-title">
        <div className="site-container">
          <div className="about-people-head">
            <Reveal>
              <span className="eyebrow eyebrow--orange">{about.teamEyebrow}</span>
              <h2 id="people-title">{about.teamTitleLine1} <em>{about.teamTitleLine2}</em></h2>
            </Reveal>
            <Reveal className="about-people-aside" delay={0.1}>
              <p>{about.teamAside}</p>
            </Reveal>
          </div>
          <div className="people-grid">
            {team.map((person, index) => (
              <Reveal key={person.name} delay={index * 0.1}>
                <article className="person-card">
                  <div className="person-media">
                    <img src={person.image} alt={person.imageAlt} loading="lazy" decoding="async" />
                    <span className="person-role">{person.role}</span>
                  </div>
                  <div className="person-body">
                    <h3>{person.name}</h3>
                    <p className="person-quote">&ldquo;{person.quote}&rdquo;</p>
                    <p className="person-why">{person.why}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="about-why" aria-labelledby="about-why-title">
        <div className="site-container about-why-grid">
          <Reveal>
            <span className="eyebrow">{about.whyEyebrow}</span>
            <h2 id="about-why-title">{about.whyTitleLine1} <em>{about.whyTitleLine2}</em></h2>
            <p>{about.whyText}</p>
            <Link to="/menu" className="button button--orange">{about.whyCta} <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </Reveal>
          <div className="about-why-list">
            {reasons.map((reason, index) => (
              <Reveal key={reason.title} delay={0.08 * index}>
                <div className="about-why-row">
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{reason.title}</h3>
                    <p>{reason.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="about-lineup" aria-labelledby="about-lineup-title">
        <div className="site-container about-lineup-grid">
          <Reveal className="about-lineup-intro">
            <span className="eyebrow eyebrow--orange">{about.lineupEyebrow}</span>
            <h2 id="about-lineup-title">{about.lineupTitleLine1}<br /><em>{about.lineupTitleLine2}</em></h2>
            <p>{about.lineupText}</p>
            <Link to="/menu" className="button button--orange">{about.lineupCta} <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </Reveal>
          <div className="about-lineup-list">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.035}>
                <Link to="/menu" className="about-lineup-item">
                  <span>0{index + 1}</span><strong>{product.name}</strong><ArrowUpRight size={19} aria-hidden="true" />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
