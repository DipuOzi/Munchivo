# Munchivo website

A React/Vite multi-page food-cart website with a persistent cart and WhatsApp-only ordering.

## Business details to add

- `src/config/site.ts`: set the WhatsApp number with country code, phone, location, opening hours, currency label, and social URLs.
- `src/data/products.ts`: replace each `price: null` with its actual numeric price. Only the six listed products are defined here.
- `src/config/site.ts` `logoSrc`: the project did not contain a logo asset. Put the supplied logo in `public/` and set this path to it. Until then, the header and footer show plain brand text rather than a replacement logo.
- `public/images/`: replace illustrative food images with approved product photography if available.

Customers review their selections on `/order`, then use the standard `wa.me` link to open a prefilled message. The site does not submit an order or take payment. While the WhatsApp number is a placeholder, the button explains why it cannot open a chat and lets the customer copy the message instead.

For production hosting with clean page URLs, configure the server to serve `index.html` for client-side routes such as `/menu` and `/order`.