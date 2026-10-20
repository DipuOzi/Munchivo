/**
 * Client for the /api/reviews service (see api/reviews.js for the server).
 *
 * The server queue is the cross-device source of truth: a review submitted on
 * any visitor's device lands in the repo's pending queue until the admin
 * approves it and publishes, which moves it into site-content.json — visible
 * to everyone on every device.
 */

import { ADMIN_CODE } from "./admin/adminCode";
import type { Review } from "./content/defaults";

export type PendingReview = Review & { date: string };

type ApiResult = {
  ok?: boolean;
  error?: string;
  reviews?: PendingReview[];
  duplicate?: boolean;
};

async function callApi(payload: Record<string, unknown>, useAdminCode: boolean): Promise<ApiResult> {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(useAdminCode ? { "x-admin-code": ADMIN_CODE } : {}),
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok) {
    throw new Error(result?.error ?? `Review service request failed (${response.status})`);
  }
  return result;
}

/** Sends a visitor review to the pending queue. Throws on any failure. */
export async function submitReview(review: { name: string; email: string; rating: number; text: string }): Promise<void> {
  await callApi({ action: "submit", ...review }, false);
}

/** Admin: the current pending queue. */
export async function fetchPendingReviews(): Promise<PendingReview[]> {
  const result = await callApi({ action: "list-pending" }, true);
  return Array.isArray(result.reviews) ? result.reviews : [];
}

/** Admin: removes one pending entry (rejection, or cleanup after approval+publish). */
export async function deletePendingReview(id: string): Promise<void> {
  await callApi({ action: "delete-pending", id }, true);
}

/* --- approved-and-published cleanup ------------------------------------------- */
/* Approving copies an entry into the admin draft, but the server queue entry is
   only discarded once the publish pipeline confirms the content commit — so a
   failed publish never loses a review. Ids wait here until that happens. */

const approvedIds = new Set<string>();

/** Queue an id for server removal. Called the moment the admin clicks Approve. */
export function markPendingApproved(id: string): void {
  approvedIds.add(id);
}

/** Best-effort: drop every approved id once its content is live. */
export async function flushApprovedDeletions(): Promise<void> {
  for (const id of [...approvedIds]) {
    try {
      await deletePendingReview(id);
      approvedIds.delete(id);
    } catch {
      // Left for the next successful publish; nothing is lost.
    }
  }
}
