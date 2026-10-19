import { ArrowUpRight, MapPin, Clock3, Phone, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { isConfigured } from "../config/site";
import { useContent } from "../context/ContentContext";
import { useWhatsApp } from "../context/WhatsAppContext";
import { Reveal } from "../components/PageElements";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "../lib/whatsapp";

export function ContactPage() {
  const { openContact } = useWhatsApp();
  const { content } = useContent();
  const contact = content.pages.contact;
  const { location, openingHours, phoneNumber, socials: socialLinks } = content.site;

  const socials = [
    { name: "Instagram", url: socialLinks.instagram, Icon: InstagramIcon },
    { name: "Facebook", url: socialLinks.facebook, Icon: FacebookIcon },
    { name: "TikTok", url: socialLinks.tiktok, Icon: TikTokIcon },
  ];

  return (
    <>
      <section className="inner-hero inner-hero--contact" aria-labelledby="contact-title">
        <img className="inner-hero-image" src={contact.heroImage} alt="" aria-hidden="true" />
        <div className="inner-hero-shade" />
        <div className="site-container inner-hero-content">
          <span className="eyebrow eyebrow--orange">{contact.eyebrow}</span>
          <h1 id="contact-title">{contact.titleLine1}<br /><em>{contact.titleLine2}</em></h1>
          <p>{contact.text}</p>
        </div>
      </section>

      <section className="contact-section section-cream" aria-labelledby="contact-details-title">
        <div className="site-container contact-grid">
          <Reveal className="contact-intro">
            <span className="eyebrow eyebrow--orange">{contact.introEyebrow}</span>
            <h2 id="contact-details-title">{contact.introTitleLine1}<br /><em>{contact.introTitleLine2}</em></h2>
            <p>{contact.introText}</p>
            <button type="button" className="button button--orange" onClick={openContact}>Chat on WhatsApp <ArrowUpRight size={19} aria-hidden="true" /></button>
            <span className="contact-order-hint">Already picked your favorites? <Link to="/order">Review your order</Link></span>
          </Reveal>

          <div className="contact-details">
            <Reveal className="contact-detail">
              <MapPin size={22} strokeWidth={1.6} aria-hidden="true" />
              <div><h3>{contact.findTitle}</h3><p>{isConfigured(location) ? location : "Location details to be added"}</p></div>
            </Reveal>
            <Reveal className="contact-detail">
              <Clock3 size={22} strokeWidth={1.6} aria-hidden="true" />
              <div><h3>{contact.hoursTitle}</h3><p>{isConfigured(openingHours) ? openingHours : "Opening hours to be added"}</p></div>
            </Reveal>
            <Reveal className="contact-detail">
              <Phone size={22} strokeWidth={1.6} aria-hidden="true" />
              <div>
                <h3>{contact.phoneTitle}</h3>
                {isConfigured(phoneNumber) ? (
                  <a href={`tel:${phoneNumber.replace(/[^+\d]/g, "")}`}>{phoneNumber}</a>
                ) : <p>Phone number to be added</p>}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="social-section" aria-labelledby="social-title">
        <div className="social-dots" aria-hidden="true" />
        <div className="site-container social-inner">
          <Reveal>
            <span className="social-pill"><Sparkles size={13} aria-hidden="true" /> {contact.socialEyebrow}</span>
            <h2 id="social-title">{contact.socialTitleLine1}<br /><em>{contact.socialTitleLine2}</em></h2>
            <p className="social-sub">{contact.socialText}</p>
          </Reveal>
          <div className="social-links">
            {socials.map(({ name, url, Icon }) => isConfigured(url) ? (
              <a key={name} className="social-card" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Munchivo on ${name}`}>
                <Icon className="social-icon" />
                <span className="social-card-main">
                  <span className="social-card-name">{name}</span>
                  <span className="social-card-action">Follow <ArrowUpRight size={16} aria-hidden="true" /></span>
                </span>
              </a>
            ) : (
              <span key={name} className="social-card social-card--pending">
                <Icon className="social-icon" />
                <span className="social-card-main">
                  <span className="social-card-name">{name}</span>
                  <span className="social-card-action">Link coming soon</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}