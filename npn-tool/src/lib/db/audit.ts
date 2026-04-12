import { prisma } from "./prisma";

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  changes: Record<string, unknown> = {}
) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details,
      changes: JSON.stringify(changes),
    },
  });
}
