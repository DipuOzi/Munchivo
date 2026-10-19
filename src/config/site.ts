import { DEFAULT_CONTENT } from "../content/defaults";

// Business details live in src/content/defaults.ts and can be edited
// from the hidden admin panel (#/admin) without touching the code.
export const siteConfig = DEFAULT_CONTENT.site;

export function isConfigured(value: string) {
  return Boolean(value.trim()) && !value.includes("_HERE");
}
