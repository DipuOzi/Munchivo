import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ContentProvider } from "./context/ContentContext";
import { CartProvider } from "./context/CartContext";
import { WhatsAppProvider } from "./context/WhatsAppContext";
import { SmoothScroll } from "./components/SmoothScroll";
import { AdminPage } from "./admin/AdminPage";
import { HomePage } from "./pages/HomePage";
import { MenuPage } from "./pages/MenuPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { OrderPage } from "./pages/OrderPage";
import { ReviewsPage } from "./pages/ReviewsPage";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Munchivo | Street Food Worth Stopping For",
    description: "Meet Munchivo, a modern food cart with six street-food favorites. Explore the menu and build your order for WhatsApp.",
  },
  "/menu": {
    title: "Menu | Munchivo",
    description: "Explore the six-item Munchivo menu: MeatBox, Mini Burger, Masala Tea, Patenga Piyaju, Pasta, and Milkshake.",
  },
  "/about": {
    title: "About Us | Munchivo",
    description: "Get to know Munchivo, a modern food cart for quick bites, street-food moments, and something good to sip.",
  },
  "/contact": {
    title: "Contact | Munchivo",
    description: "Get in touch with Munchivo. Find contact details and connect on WhatsApp.",
  },
  "/order": {
    title: "Your Order | Munchivo",
    description: "Review your Munchivo order and send it yourself through WhatsApp. No online payment required.",
  },
  "/reviews": {
    title: "Reviews | Munchivo",
    description: "Read what people say about the Munchivo cart — and leave a review of your own street-food stop.",
  },
};

function NotFoundPage() {
  return (
    <section className="not-found-page">
      <div className="site-container">
        <span className="eyebrow eyebrow--orange">404 / WRONG TURN</span>
        <h1>Let's get you<br /><em>back on track.</em></h1>
        <p>That page is not on the menu.</p>
        <Link to="/" className="button button--orange">Back to Munchivo <ArrowUpRight size={19} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

function Site() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const meta = pageMeta[location.pathname] ?? { title: "Munchivo", description: pageMeta["/"].description };
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -10 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}

/**
 * The admin panel lives at the hash URL #/admin. It is not linked anywhere
 * on the site, and it is gated behind an access code on the admin screen.
 */
function isAdminHash() {
  return window.location.hash.toLowerCase().startsWith("#/admin");
}

function Root() {
  const [isAdmin, setIsAdmin] = useState(isAdminHash);

  useEffect(() => {
    const onHashChange = () => setIsAdmin(isAdminHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (isAdmin) return <AdminPage />;

  return (
    <SmoothScroll>
      <Site />
    </SmoothScroll>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ContentProvider>
        <CartProvider>
          <WhatsAppProvider>
            <Root />
          </WhatsAppProvider>
        </CartProvider>
      </ContentProvider>
    </BrowserRouter>
  );
}
