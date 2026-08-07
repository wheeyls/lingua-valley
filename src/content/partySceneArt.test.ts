import { describe, it, expect } from "vitest";
import { renderPartySceneHtml } from "./partySceneArt.js";
import { sceneForDay, type DailyScene } from "../domain/objectives/partyScene.js";

const PINNED_SCENE: DailyScene = [
  { slot: "cooler", item: "globo", position: 0 },
  { slot: "table", item: "regalo", position: 0 },
  { slot: "tree", item: "pastel", position: 1 },
];

describe("renderPartySceneHtml", () => {
  it("never leaks target-language (or English) vocabulary — pictures only", () => {
    const words = [
      "hielera",
      "mesa",
      "árbol",
      "arbol",
      "encima",
      "debajo",
      "delante",
      "detrás",
      "detras",
      "izquierda",
      "derecha",
      "cooler",
      "table",
      "tree",
      "top",
      "under",
      "front",
      "behind",
      "left",
      "right",
    ];
    for (const day of ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"]) {
      const visibleText = renderPartySceneHtml(sceneForDay(day))
        .replace(/<[^>]*>/g, " ")
        .toLowerCase();
      for (const word of words) {
        expect(visibleText).not.toContain(word);
      }
    }
  });

  it("renders the park background plus one image per occupied slot", () => {
    const html = renderPartySceneHtml(PINNED_SCENE);
    expect(html).toContain("scene-bg");
    expect(html.match(/<img/g)).toHaveLength(4); // park + 3 items
  });

  it("points each item image at its own asset, distinct from the others", () => {
    const html = renderPartySceneHtml(PINNED_SCENE);
    const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(srcs).size).toBe(srcs.length);
    expect(srcs.some((s) => /globo/i.test(s))).toBe(true);
    expect(srcs.some((s) => /regalo/i.test(s))).toBe(true);
    expect(srcs.some((s) => /pastel/i.test(s))).toBe(true);
  });

  it("places position-0 and position-1 items at different points, and dims only position 1", () => {
    const front = renderPartySceneHtml([{ slot: "cooler", item: "vela", position: 0 }]);
    const behind = renderPartySceneHtml([{ slot: "cooler", item: "vela", position: 1 }]);
    expect(front).not.toContain("scene-item-dim");
    expect(behind).toContain("scene-item-dim");

    const frontStyle = front.match(/style="([^"]+)"/)![1];
    const behindStyle = behind.match(/style="([^"]+)"/)![1];
    expect(frontStyle).not.toBe(behindStyle);
  });

  it("omits an item image for a slot the scene doesn't mention", () => {
    const html = renderPartySceneHtml([{ slot: "tree", item: "pinata", position: 0 }]);
    expect(html.match(/<img/g)).toHaveLength(2); // park + tree item only
  });

  it("matches the pinned example end to end", () => {
    const html = renderPartySceneHtml(PINNED_SCENE);
    expect(html).toMatch(/src="[^"]*park\.svg[^"]*"/);
    expect(html).toMatch(/src="[^"]*globo\.svg[^"]*"/);
    expect(html).toMatch(/src="[^"]*regalo\.svg[^"]*"/);
    expect(html).toMatch(/src="[^"]*pastel\.svg[^"]*"/);
  });
});
