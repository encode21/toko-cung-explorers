import { z } from "zod";
const mission = z
  .object({
    id: z.string().max(220),
    type: z.enum(["STORE_RUSH_HELP_CASHIER", "WAREHOUSE_RUSH_HELP_PACKING"]),
    sourceEventId: z.string().min(1).max(100),
    status: z.enum(["ACCEPTED", "ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"]),
    acceptedAt: z.number().safe().nonnegative(),
    expiresAt: z.number().safe().nonnegative(),
    sourceEndedAt: z.number().safe().nonnegative().nullable(),
    progress: z.number().int().min(0).max(5),
    carrying: z.boolean(),
    lastActionAt: z.number().safe().nonnegative(),
    reward: z.literal(1),
  })
  .refine(
    (m) =>
      m.expiresAt > m.acceptedAt && m.progress <= (m.type === "STORE_RUSH_HELP_CASHIER" ? 5 : 3),
  );
const session = z
  .object({
    revision: z.number().safe().nonnegative(),
    active: mission.nullable(),
    last: mission.nullable(),
    finished: z.array(z.string().max(100)).max(64),
    contribution: z.number().int().min(0).max(100000),
    updatedAt: z.number().safe().nonnegative(),
  })
  .refine((s) => !s.active || ["ACCEPTED", "ACTIVE"].includes(s.active.status));
export const roomSchema = z.object({
  revision: z.number().safe().nonnegative(),
  sessions: z.record(z.string().uuid(), session).refine((s) => Object.keys(s).length <= 64),
});
export const commandSchema = z.object({
  from: z.string().max(100),
  requestId: z.string().uuid(),
  revision: z.number().safe().nonnegative(),
  action: z.enum(["accept", "scan", "take", "place", "cancel"]),
  sourceEventId: z.string().max(100).optional(),
});
