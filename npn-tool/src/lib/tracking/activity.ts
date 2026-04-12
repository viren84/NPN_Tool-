import { prisma } from "../db/prisma";

/**
 * Log a user activity. Non-blocking — errors are silently caught.
 */
export function trackActivity(
  userId: string,
  action: string,
  options: {
    entityType?: string;
    entityId?: string;
    entityName?: string;
    pagePath?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  } = {}
) {
  // Fire and forget — don't await, don't block
  prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType: options.entityType || "",
      entityId: options.entityId || "",
      entityName: options.entityName || "",
      pagePath: options.pagePath || "",
      details: options.details || "",
      ipAddress: options.ipAddress || "",
      userAgent: options.userAgent || "",
    },
  }).catch(() => { /* silently ignore tracking errors */ });
}

/**
 * Track a page view
 */
export function trackView(userId: string, pagePath: string, entityType?: string, entityId?: string, entityName?: string) {
  trackActivity(userId, "view", { pagePath, entityType, entityId, entityName });
}

/**
 * Track a download
 */
export function trackDownload(userId: string, entityType: string, entityId: string, entityName: string) {
  trackActivity(userId, "download", { entityType, entityId, entityName });
}

/**
 * Track a search
 */
export function trackSearch(userId: string, query: string, resultCount: number) {
  trackActivity(userId, "search", { details: `Query: "${query}" → ${resultCount} results` });
}
