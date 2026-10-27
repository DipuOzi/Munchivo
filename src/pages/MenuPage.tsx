import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { OffersSection } from "../components/OffersSection";
import { BundleSection } from "../components/BundleSection";
import { Reveal } from "../components/PageElements";
import { useCart } from "../context/CartContext";
import { useContent } from "../context/ContentContext";

export function MenuPage() {
  const { itemCount } = useCart();
  const { content } = useContent();
  const menu = content.pages.menu;
  const products = content.products;

  return (
    <>
      <section className="inner-hero inner-hero--menu" aria-labelledby="menu-title">
        <img className="inner-hero-image" src={menu.heroImage} alt="" aria-hidden="true" />
        <div className="inner-hero-shade" />
        <div className="site-container inner-hero-content">
          <span className="eyebrow eyebrow--orange">{menu.eyebrow}</span>
          <h1 id="menu-title">{menu.titleLine1}<br /><em>{menu.titleLine2}</em></h1>
          <p>{menu.text}</p>
        </div>
      </section>

      <section className="menu-section" aria-label="Munchivo menu items">
        <div className="site-container">
          <Reveal className="menu-section-heading">
            <span className="eyebrow eyebrow--orange">{menu.sectionEyebrow}</span>
            <h2>{menu.sectionTitle}</h2>
            <p>{menu.sectionText}</p>
          </Reveal>
          <div className="product-grid product-grid--menu">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} showQuantity />
            ))}
          </div>
        </div>
      </section>

      <OffersSection />

      <BundleSection>
        <Reveal className="menu-bottom-link">
          <span>{menu.bottomHeading}</span>
          <Link to="/order" className="text-link text-link--dark">
            {menu.bottomLinkLabel}{itemCount > 0 ? ` (${itemCount})` : ""} <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </Reveal>
      </BundleSection>
    </>
  );
}
