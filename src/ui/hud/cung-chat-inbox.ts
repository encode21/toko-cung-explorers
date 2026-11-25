/** Dashboard "Tagihan": the bills thread (Koko Cung rent), never the newest NPC chat. */
export const billConversation = <T extends { kind: string }>(conversations: T[]): T =>
  conversations.find((c) => c.kind === "rent") ?? conversations[0]!;
