import { ArrowUpRight, Cookie, CupSoda } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { useContent } from "../context/ContentContext";
import { useWhatsApp } from "../context/WhatsAppContext";
import { WhatsAppIcon } from "../lib/whatsapp";

type SocialDef = { key: string; href: string; label: string; icon: ReactNode };

const STAR = "M12 1.8 14.7 8.6 22 9.2 16.5 14 18.2 21.2 12 17.4 5.8 21.2 7.5 14 2 9.2 9.3 8.6Z";

export function Footer() {
  const { openContact } = useWhatsApp();
  const { content } = useContent();
  const { name, socials } = content.site;
  const shared = content.pages.shared;

  // Let the last three words of the tagline fall into the serif accent face.
  const words = shared.footerTagline.split(" ").filter(Boolean);
  const tailStart = Math.max(words.length - 3, 0);
  const lineHead = words.slice(0, tailStart).join(" ");
  const lineTail = words.slice(tailStart).join(" ");

  const socialLinks = (
    [
      { key: "instagram", href: socials.instagram, label: "Instagram", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" /></svg> },
      { key: "facebook", href: socials.facebook, label: "Facebook", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15.5 3.5h-2.6a3.4 3.4 0 0 0-3.4 3.4v2.6H6.8v3.6h2.7v7.4h3.6v-7.4h2.9l.6-3.6h-3.5V7.2c0-.5.4-1 1-1h1.4Z" /></svg> },
      { key: "tiktok", href: socials.tiktok, label: "TikTok", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13.8 3.2v11.2a3.6 3.6 0 1 1-3.6-3.6" /><path d="M13.8 5.4a4.9 4.9 0 0 0 4.9 4.2" /></svg> },
    ] as SocialDef[]
  ).filter((social) => Boolean(social.href));

  return (
    <footer className="site-footer">
      {/* Background layer: dotted patches + oversized food doodles flanking the wordmark. */}
      <div className="footer-bg" aria-hidden="true">
        <span className="footer-dots footer-dots--a" />
        <span className="footer-dots footer-dots--b" />
        <CupSoda className="footer-doodle footer-doodle--a" strokeWidth={0.9} />
        <Cookie className="footer-doodle footer-doodle--b" strokeWidth={0.9} />
      </div>

      {/* Statement row: tagline on the left, all of the navigation on the right. */}
      <div className="site-container footer-main">
        <div className="footer-hero">
          <div className="footer-lead">
            <span className="footer-brandmark"><Brand /></span>
            <h2 className="footer-line">
              {lineHead}
              {lineTail ? <> <em>{lineTail}</em></> : null}
            </h2>
          </div>

          <div className="footer-grid">
            <nav className="footer-column footer-column--explore" aria-label={shared.footerExploreLabel}>
              <span className="footer-label">{shared.footerExploreLabel}</span>
              {[
                { index: "01", to: "/", label: "Home" },
                { index: "02", to: "/menu", label: "Menu" },
                { index: "03", to: "/about", label: "About us" },
                { index: "04", to: "/reviews", label: "Reviews" },
                { index: "05", to: "/contact", label: "Contact" },
              ].map((item) => (
                <Link key={item.index} to={item.to} className="footer-navlink">
                  <span className="footer-navindex" aria-hidden="true">{item.index}</span>
                  <span className="footer-navlabel">{item.label}</span>
                  <ArrowUpRight className="footer-navarrow" size={16} aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <div className="footer-column">
              <span className="footer-label">{shared.footerHelloLabel}</span>
              <button type="button" onClick={openContact}><WhatsAppIcon /> WhatsApp <ArrowUpRight size={15} /></button>
              <Link to="/order">Your order <ArrowUpRight size={15} /></Link>
            </div>

            <div className="footer-column">
              <span className="footer-label">Follow</span>
              {socialLinks.map((social) => (
                <a key={social.key} href={social.href} target="_blank" rel="noreferrer">
                  {social.icon} {social.label} <ArrowUpRight size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Red ticker ribbon — dropped down as the band before the wordmark. */}
      <div className="footer-band">
        <div className="footer-band-track">
          {[0, 1].map((half) => (
            <span className="footer-band-half" key={half} aria-hidden={half === 1}>
              {Array.from({ length: 24 }, (_, i) => (
                <span className="footer-band-chunk" key={i}>
                  <b>{shared.footerHeadingLine1}</b>
                  <em>{shared.footerHeadingLine2}</em>
                  <svg className="footer-band-star" viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="footer-wordmark" aria-hidden="true">
        <span>{name.replace(/\.+$/, "").toUpperCase()}<b>.</b></span>
      </div>

      <div className="site-container footer-bottom">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>{shared.footerBottomLine}</span>
      </div>
    </footer>
  );
}
