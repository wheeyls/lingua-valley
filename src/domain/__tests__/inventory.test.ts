import { describe, it, expect } from "vitest";
import {
  emptyInventory,
  countOf,
  has,
  add,
  remove,
  ticketId,
  hasTicketTo,
} from "../inventory";

describe("inventory", () => {
  it("starts empty", () => {
    const inv = emptyInventory();
    expect(countOf(inv, "x")).toBe(0);
    expect(has(inv, "x")).toBe(false);
  });

  it("adds and counts items", () => {
    let inv = add(emptyInventory(), "apple");
    expect(countOf(inv, "apple")).toBe(1);
    inv = add(inv, "apple", 2);
    expect(countOf(inv, "apple")).toBe(3);
    expect(has(inv, "apple")).toBe(true);
  });

  it("ignores non-positive add quantities", () => {
    const inv = add(emptyInventory(), "apple", 0);
    expect(has(inv, "apple")).toBe(false);
  });

  it("removes items and clears keys at zero", () => {
    let inv = add(emptyInventory(), "apple", 2);
    inv = remove(inv, "apple");
    expect(countOf(inv, "apple")).toBe(1);
    inv = remove(inv, "apple");
    expect(countOf(inv, "apple")).toBe(0);
    expect("apple" in inv).toBe(false); // key removed
  });

  it("never removes below zero", () => {
    const inv = remove(emptyInventory(), "apple", 5);
    expect(countOf(inv, "apple")).toBe(0);
  });

  it("does not mutate the original inventory", () => {
    const inv = emptyInventory();
    add(inv, "apple");
    expect(has(inv, "apple")).toBe(false);
  });

  it("models train tickets per area", () => {
    expect(ticketId("mercado")).toBe("ticket:mercado");
    let inv = emptyInventory();
    expect(hasTicketTo(inv, "mercado")).toBe(false);
    inv = add(inv, ticketId("mercado"));
    expect(hasTicketTo(inv, "mercado")).toBe(true);
    expect(hasTicketTo(inv, "playa")).toBe(false);
  });
});
