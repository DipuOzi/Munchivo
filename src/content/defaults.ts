// The single source of truth for every editable piece of the site.
// The admin panel (hidden at #/admin) edits a copy of this structure,
// which is persisted in the browser's localStorage.

export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  price: number | null;
};

export type TeamMember = {
  name: string;
  role: string;
  quote: string;
  why: string;
  image: string;
  imageAlt: string;
};

export type Review = {
  id: string;
  name: string;
  /** Visitor email — stored for the owner, never shown on the public wall. */
  email: string;
  /** 1–5 stars. */
  rating: number;
  text: string;
  /** Submission time (ISO) — set on reviews approved from the pending queue. */
  date?: string;
};

export type Step = { title: string; text: string };
export type Reason = { title: string; text: string };
export type WhyCard = { num: string; image: string; alt: string; title: string; text: string; tag: string };
export type Stat = { value: string; label: string };

export type SiteContent = {
  site: {
    name: string;
    logoSrc: string;
    whatsappNumber: string;
    phoneNumber: string;
    location: string;
    openingHours: string;
    currencyLabel: string;
    socials: { instagram: string; facebook: string; tiktok: string };
  };
  products: Product[];
  team: TeamMember[];
  reviews: {
    /** Page hero. */
    heroEyebrow: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroText: string;
    heroImage: string;
    /** Review submission form. */
    formHeading: string;
    formText: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    reviewPlaceholder: string;
    submitLabel: string;
    successNote: string;
    /** The review wall — newest first. */
    list: Review[];
  };
  pages: {
    home: {
      heroImage: string;
      heroImageAlt: string;
      heroTitle: string;
      heroHeadingLine1: string;
      heroHeadingLine2: string;
      heroText: string;
      signatureEyebrow: string;
      signatureTitleLine1: string;
      signatureTitleLine2: string;
      signatureAside: string;
      experienceImage: string;
      experienceImageAlt: string;
      experienceCardOneImage: string;
      experienceCardTwoImage: string;
      experienceEyebrow: string;
      experienceTitleLine1: string;
      experienceTitleLine2: string;
      experienceText: string;
      steps: Step[];
      statementPill: string;
      statementLine1: string;
      statementLine2: string;
      statementLine3: string;
      statementText: string;
      statementStats: Stat[];
      statementCardOneCaption: string;
      statementCardTwoCaption: string;
      whyEyebrow: string;
      whyTitleLine1: string;
      whyTitleLine2: string;
      whyAside: string;
      whyCards: WhyCard[];
      heroKicker: string;
      heroPrimaryCta: string;
      heroSecondaryCta: string;
      heroTrust: string;
      heroFanLabel: string;
      signatureLinkLabel: string;
      experiencePrimaryCta: string;
      experienceSecondaryCta: string;
      statementPrimaryCta: string;
      statementSecondaryCta: string;
      whyLinkLabel: string;
      whyCardCta: string;
    };
    menu: {
      heroImage: string;
      eyebrow: string;
      titleLine1: string;
      titleLine2: string;
      text: string;
      sectionEyebrow: string;
      sectionTitle: string;
      sectionText: string;
      bottomHeading: string;
      bottomLinkLabel: string;
    };
    about: {
      heroImage: string;
      eyebrow: string;
      titleLine1: string;
      titleLine2: string;
      text: string;
      teamEyebrow: string;
      teamTitleLine1: string;
      teamTitleLine2: string;
      teamAside: string;
      whyEyebrow: string;
      whyTitleLine1: string;
      whyTitleLine2: string;
      whyText: string;
      reasons: Reason[];
      lineupEyebrow: string;
      lineupTitleLine1: string;
      lineupTitleLine2: string;
      lineupText: string;
      whyCta: string;
      lineupCta: string;
    };
    contact: {
      heroImage: string;
      eyebrow: string;
      titleLine1: string;
      titleLine2: string;
      text: string;
      introEyebrow: string;
      introTitleLine1: string;
      introTitleLine2: string;
      introText: string;
      findTitle: string;
      hoursTitle: string;
      phoneTitle: string;
      socialEyebrow: string;
      socialTitleLine1: string;
      socialTitleLine2: string;
      socialText: string;
      whatsappCta: string;
      orderPrompt: string;
      orderLinkLabel: string;
    };
    order: {
      eyebrowPrefix: string;
      titleLine1: string;
      titleLine2: string;
      text: string;
      itemsHeading: string;
      addMoreLabel: string;
      emptyEyebrow: string;
      emptyTitle: string;
      emptyText: string;
      emptyCta: string;
      summaryEyebrow: string;
      summaryTitle: string;
      summaryPreviewLabel: string;
      summaryNote: string;
      checkoutLabel: string;
      disclaimer: string;
    };
    shared: {
      footerTagline: string;
      footerHeadingLine1: string;
      footerHeadingLine2: string;
      footerExploreLabel: string;
      footerHelloLabel: string;
      footerBottomLine: string;
    };
  };
};

export const DEFAULT_CONTENT: SiteContent = {
  site: {
    name: "Munchivo",
    logoSrc: "/images/logo.svg",
    whatsappNumber: "WHATSAPP_NUMBER_HERE",
    phoneNumber: "PHONE_NUMBER_HERE",
    location: "LOCATION_HERE",
    openingHours: "OPENING_HOURS_HERE",
    currencyLabel: "৳",
    socials: {
      instagram: "INSTAGRAM_URL_HERE",
      facebook: "FACEBOOK_URL_HERE",
      tiktok: "TIKTOK_URL_HERE",
    },
  },
  products: [
    {
      id: "meatbox",
      name: "MeatBox",
      description: "A hearty box built for your biggest street-food craving.",
      image: "/images/meatbox.jpg",
      imageAlt: "A takeaway box of grilled meat on a food cart counter",
      price: 250,
    },
    {
      id: "mini-burger",
      name: "Mini Burger",
      description: "A little burger with a whole lot of bite.",
      image: "/images/mini-burger.jpg",
      imageAlt: "Two mini burgers on parchment paper",
      price: 120,
    },
    {
      id: "masala-tea",
      name: "Masala Tea",
      description: "A warming sip for the moments in between.",
      image: "/images/masala-tea.jpg",
      imageAlt: "A steaming cup of masala tea",
      price: 40,
    },
    {
      id: "patenga-piyaju",
      name: "Patenga Piyaju",
      description: "Golden, crisp bites with street-side character.",
      image: "/images/patenga-piyaju.jpg",
      imageAlt: "Golden piyaju fritters in a paper-lined tray",
      price: 60,
    },
    {
      id: "pasta",
      name: "Pasta",
      description: "Comfort in a bowl, ready to take along.",
      image: "/images/pasta.jpg",
      imageAlt: "A bowl of saucy pasta at a food cart",
      price: 180,
    },
    {
      id: "milkshake",
      name: "Milkshake",
      description: "A cool, creamy sip to round things out.",
      image: "/images/milkshake.jpg",
      imageAlt: "A creamy milkshake in a takeaway cup",
      price: 150,
    },
  ],
  team: [
    {
      name: "Arif",
      role: "The cook",
      quote: "If it leaves the cart late, it doesn't leave at all.",
      why: "He runs the grill with one rule — the same plate every single time, never rushed.",
      image: "/images/team-cook.jpg",
      imageAlt: "A cook at the grill behind the Munchivo cart",
    },
    {
      name: "Nusrat",
      role: "Runs the cart",
      quote: "The menu is short on purpose. Everything on it is something I'd want.",
      why: "She runs the counter, the day and the details — and remembers what you ordered last time.",
      image: "/images/team-cart.jpg",
      imageAlt: "A cart lead arranging a paper tray at the Munchivo counter",
    },
    {
      name: "Tanvir",
      role: "The drinks",
      quote: "A good sip should match the mood.",
      why: "From a hot masala tea to a thick shake, he makes sure the sip goes with the bite.",
      image: "/images/milkshake.jpg",
      imageAlt: "A tall creamy milkshake from the Munchivo drinks corner",
    },
  ],
  reviews: {
    heroEyebrow: "WORD ON THE STREET",
    heroTitleLine1: "Straight from",
    heroTitleLine2: "the regulars.",
    heroText:
      "Real things people said after a stop at the cart. Read a few — then scroll down and leave your own.",
    heroImage: "/images/hero-street-food.jpg",
    formHeading: "Tried something from the cart?",
    formText: "Leave a quick review — how was the bite, the sip, the stop? Your words go to our team first, then straight onto the wall.",
    namePlaceholder: "Your name",
    emailPlaceholder: "you@example.com",
    reviewPlaceholder: "How was it? Keep it honest.",
    submitLabel: "Post my review",
    successNote: "Thank you — your review is in. It will appear on the wall shortly.",
    list: [
      {
        id: "rv-sadia",
        name: "Sadia K.",
        email: "sadia.k@example.com",
        rating: 5,
        text: "The MeatBox genuinely ruined other burgers for me. Crispy, saucy, huge — and it was ready in minutes.",
      },
      {
        id: "rv-tanvir",
        name: "Tanvir H.",
        email: "tanvir.h@example.com",
        rating: 5,
        text: "Stopped for a masala tea on a whim and left with two Mini Burgers as well. That combo is dangerous.",
      },
      {
        id: "rv-nusrat",
        name: "Nusrat J.",
        email: "nusrat.j@example.com",
        rating: 5,
        text: "Fresh, fast and full of flavor. The pasta was still steaming when I got back to the office.",
      },
      {
        id: "rv-rafi",
        name: "Rafi A.",
        email: "rafi.a@example.com",
        rating: 5,
        text: "The piyaju tastes like the real Patenga thing. And the milkshake? Thickest I have had in the city.",
      },
    ],
  },
  pages: {
    home: {
      heroImage: "/images/team-cook.jpg",
      heroImageAlt: "A chef grilling meat at the Munchivo street-food cart at dusk",
      heroTitle: "MUNCHIVO.",
      heroHeadingLine1: "A little cart.",
      heroHeadingLine2: "A lot to crave.",
      heroText: "Meet your new favorite stop for street-food moments, quick bites, and feel-good sips.",
      signatureEyebrow: "01 / THE LINEUP",
      signatureTitleLine1: "Six ways to",
      signatureTitleLine2: "make your day.",
      signatureAside: "A focused little lineup of bites and sips. Pick what sounds good and make it yours.",
      experienceImage: "/images/cart-experience.jpg",
      experienceImageAlt: "A customer receiving mini burgers at a warmly lit food cart",
      experienceCardOneImage: "/images/masala-tea.jpg",
      experienceCardTwoImage: "/images/patenga-piyaju.jpg",
      experienceEyebrow: "02 / THE EXPERIENCE",
      experienceTitleLine1: "It starts",
      experienceTitleLine2: "with a stop.",
      experienceText:
        "There is something special about the energy of street food. Spot the cart, follow the craving, and take a little time for something good.",
      steps: [
        { title: "Spot the cart", text: "Follow the warm lights and the good smells." },
        { title: "Pick your favorites", text: "Six choices, from quick bites to cool sips." },
        { title: "Send it on WhatsApp", text: "Review your order, then send it in one tap." },
      ],
      statementPill: "A LITTLE REMINDER",
      statementLine1: "Good things",
      statementLine2: "happen",
      statementLine3: "on the way.",
      statementText: "One craving is all it takes. Pull up to the cart, grab your favorite, and keep your day moving.",
      statementStats: [
        { value: "06", label: "signature picks" },
        { value: "01", label: "tap to order" },
      ],
      statementCardOneCaption: "Fresh off the cart",
      statementCardTwoCaption: "Cool & creamy",
      whyEyebrow: "WHY MUNCHIVO?",
      whyTitleLine1: "Good food.",
      whyTitleLine2: "No overthinking.",
      whyAside: "A straightforward menu, the feel of a food cart, and an easy way to get your order together.",
      heroKicker: "Street food · Made properly",
      heroPrimaryCta: "View the menu",
      heroSecondaryCta: "Take a look",
      heroTrust: "No app. No card. Pay at the cart.",
      heroFanLabel: "grab a favorite",
      signatureLinkLabel: "Explore the full menu",
      experiencePrimaryCta: "Start your order",
      experienceSecondaryCta: "Get to know Munchivo",
      statementPrimaryCta: "Find your favorite",
      statementSecondaryCta: "Order on WhatsApp",
      whyLinkLabel: "See the full lineup",
      whyCardCta: "Explore",
      whyCards: [
        {
          num: "01",
          image: "/images/meatbox.jpg",
          alt: "MeatBox served at the Munchivo cart",
          title: "A focused menu",
          text: "Six choices across quick bites, comforting food, and something to sip. No endless scrolling, no decision fatigue.",
          tag: "6 picks",
        },
        {
          num: "02",
          image: "/images/cart-experience.jpg",
          alt: "The Munchivo food cart at dusk",
          title: "Food-cart energy",
          text: "The simple pleasure of finding a good bite while you are out and about — warm lights, good smells, good mood.",
          tag: "street-side",
        },
        {
          num: "03",
          image: "/images/masala-tea.jpg",
          alt: "A cup of masala tea at the cart",
          title: "Order your way",
          text: "Choose your favorites here, then review and send your order on WhatsApp. No accounts, no payment forms.",
          tag: "1-tap order",
        },
      ],
    },
    menu: {
      heroImage: "/images/meatbox.jpg",
      eyebrow: "THE MUNCHIVO MENU",
      titleLine1: "Pick your",
      titleLine2: "happy place.",
      text: "Six good things, one easy decision: whatever you are craving. Add your picks and send your order on WhatsApp.",
      sectionEyebrow: "THE LINEUP / 06 ITEMS",
      sectionTitle: "All the good stuff.",
      sectionText: "Pick your quantity, add to your order, or send a single item straight to WhatsApp.",
      bottomHeading: "Found what you are looking for?",
      bottomLinkLabel: "Review your order",
    },
    about: {
      heroImage: "/images/cart-experience.jpg",
      eyebrow: "A LITTLE ABOUT US",
      titleLine1: "Three people.",
      titleLine2: "One little cart.",
      text: "Munchivo is run by three friends with a simple idea: good food belongs out there, and a short stop can be the best part of the day.",
      teamEyebrow: "THE TEAM",
      teamTitleLine1: "Behind the",
      teamTitleLine2: "counter.",
      teamAside:
        "Three friends, one cart, and a shared obsession with doing street food properly. This is the crew that keeps Munchivo moving.",
      whyEyebrow: "WHY WE DO IT",
      whyTitleLine1: "It's a",
      whyTitleLine2: "simple reason.",
      whyText: "Three of us, one cart, and the belief that the good stuff should come to you — no fuss, no long lines, no overthinking.",
      reasons: [
        {
          title: "Cravings deserve a shortcut",
          text: "Sometimes the best decision of the day is the one you make in ten seconds.",
        },
        {
          title: "Street food feels like a moment",
          text: "Not just a meal — a warm light, a good smell, and something worth stopping for.",
        },
        {
          title: "A small cart can give a big smile",
          text: "Six things, done properly, over and over. That is the whole job, and we love it.",
        },
      ],
      lineupEyebrow: "SIX WAYS TO CRAVE",
      lineupTitleLine1: "A little something",
      lineupTitleLine2: "for your mood.",
      lineupText: "From savory bites to a warm or cold sip, the Munchivo menu keeps the choice simple.",
      whyCta: "Taste the result",
      lineupCta: "Explore the menu",
    },
    contact: {
      heroImage: "/images/masala-tea.jpg",
      eyebrow: "LET'S TALK FOOD",
      titleLine1: "Come say",
      titleLine2: "hello.",
      text: "Have a question or ready to order? Reach out on WhatsApp, or find the cart details below.",
      introEyebrow: "GET IN TOUCH",
      introTitleLine1: "We're all",
      introTitleLine2: "ears.",
      introText: "WhatsApp is the easiest way to ask a question or get an order conversation started.",
      findTitle: "Find the cart",
      hoursTitle: "Opening hours",
      phoneTitle: "Phone",
      socialEyebrow: "STAY IN THE LOOP",
      socialTitleLine1: "Find us",
      socialTitleLine2: "online.",
      socialText: "New drops, cart spots and everyday cravings. Follow along.",
      whatsappCta: "Chat on WhatsApp",
      orderPrompt: "Already picked your favorites?",
      orderLinkLabel: "Review your order",
    },
    order: {
      eyebrowPrefix: "YOUR ORDER",
      titleLine1: "Your picks.",
      titleLine2: "Your moment.",
      text: "Take one last look. When you are ready, you will review and send your message in WhatsApp yourself.",
      itemsHeading: "In your bag",
      addMoreLabel: "Add more from the menu",
      emptyEyebrow: "NOTHING IN THE BAG YET",
      emptyTitle: "A good order starts somewhere.",
      emptyText: "Your bag is empty. Find something that sounds good on the menu and add it here.",
      emptyCta: "Explore the menu",
      summaryEyebrow: "ONE LAST LOOK",
      summaryTitle: "Order summary",
      summaryPreviewLabel: "Preview WhatsApp message",
      summaryNote:
        "Prices are not set yet. Your message will show them as \"To be confirmed\" until actual prices are added.",
      checkoutLabel: "Checkout via WhatsApp",
      disclaimer: "Opens WhatsApp with your order pre-filled. Pay at the cart - no online payment.",
    },
    shared: {
      footerTagline: "Good food for wherever the day takes you.",
      footerHeadingLine1: "See you at",
      footerHeadingLine2: "the cart.",
      footerExploreLabel: "EXPLORE",
      footerHelloLabel: "SAY HELLO",
      footerBottomLine: "Street food, your way.",
    },
  },
};
