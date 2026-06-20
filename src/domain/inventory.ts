/**
 * Inventory — the things a player is holding.
 *
 * Right now the only items that matter are TRAIN TICKETS (a ticket to a given
 * area lets you travel there). Modeling this as an inventory rather than a pile
 * of booleans means new item kinds (extra ticket types, future goods) slot in
 * without touching PlayerState's shape.
 *
 * Items are identified by a stable string id and tracked by quantity, so the
 * same structure handles both unique items (a ticket you own or don't) and
 * stackable ones.
 *
 * PURE DOMAIN: no framework imports, fully testable.
 */

/** Quantity per item id. Absent / 0 means "none". */
export type Inventory = Record<string, number>;

/** A train ticket item id for travelling to a given area. */
export function ticketId(areaId: string): string {
  return `ticket:${areaId}`;
}

export function emptyInventory(): Inventory {
  return {};
}

/** How many of `itemId` the player holds. */
export function countOf(inv: Inventory, itemId: string): number {
  return inv[itemId] ?? 0;
}

/** Whether the player holds at least one of `itemId`. */
export function has(inv: Inventory, itemId: string): boolean {
  return countOf(inv, itemId) > 0;
}

/** Add `qty` of an item. Pure — returns a new inventory. */
export function add(inv: Inventory, itemId: string, qty = 1): Inventory {
  if (qty <= 0) return inv;
  return { ...inv, [itemId]: countOf(inv, itemId) + qty };
}

/**
 * Remove up to `qty` of an item (never below 0). Pure — returns a new
 * inventory. Item keys that drop to 0 are removed to keep the record clean.
 */
export function remove(inv: Inventory, itemId: string, qty = 1): Inventory {
  const next = Math.max(0, countOf(inv, itemId) - qty);
  const out = { ...inv };
  if (next === 0) delete out[itemId];
  else out[itemId] = next;
  return out;
}

/** Whether the player holds a ticket to the given area. */
export function hasTicketTo(inv: Inventory, areaId: string): boolean {
  return has(inv, ticketId(areaId));
}
