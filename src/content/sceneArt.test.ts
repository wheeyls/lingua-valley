import { describe, it, expect } from "vitest";
import { renderSceneHtml } from "./sceneArt.js";
import { sceneForDay, type DailyScene } from "../domain/objectives/scene.js";

const PINNED_SCENE: DailyScene = [
  { slot: "door", item: "hat", position: 0 },
  { slot: "table", item: "key", position: 0 },
  { slot: "vase", item: "ball", position: 1 },
];

describe("renderSceneHtml", () => {
  it("never leaks target-language (or English) vocabulary — pictures only", () => {
    // The whole point of the fix: no words the player could just read off
    // the screen instead of producing themselves. Strip tags/attributes
    // first — those are internal asset paths/styling hooks, never shown to
    // the player.
    const words = [
      "puerta",
      "mesa",
      "florero",
      "encima",
      "debajo",
      "delante",
      "detrás",
      "izquierda",
      "derecha",
      "door",
      "table",
      "vase",
      "top",
      "under",
      "front",
      "behind",
      "left",
      "right",
    ];
    for (const day of ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"]) {
      const visibleText = renderSceneHtml(sceneForDay(day))
        .replace(/<[^>]*>/g, " ")
        .toLowerCase();
      for (const word of words) {
        expect(visibleText).not.toContain(word);
      }
    }
  });

  it("renders the room background plus one image per occupied slot", () => {
    const html = renderSceneHtml(PINNED_SCENE);
    expect(html).toContain("scene-bg");
    expect(html.match(/<img/g)).toHaveLength(4); // room + 3 items
  });

  it("points each item image at its own asset, distinct from the others", () => {
    const html = renderSceneHtml(PINNED_SCENE);
    const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(srcs).size).toBe(srcs.length); // room + hat + key + ball, all different
    expect(srcs.some((s) => /hat/i.test(s))).toBe(true);
    expect(srcs.some((s) => /key/i.test(s))).toBe(true);
    expect(srcs.some((s) => /ball/i.test(s))).toBe(true);
  });

  it("places position-0 and position-1 items at different points, and dims only position 1", () => {
    const front = renderSceneHtml([{ slot: "door", item: "cat", position: 0 }]);
    const behind = renderSceneHtml([{ slot: "door", item: "cat", position: 1 }]);
    expect(front).not.toContain("scene-item-dim");
    expect(behind).toContain("scene-item-dim");

    const frontStyle = front.match(/style="([^"]+)"/)![1];
    const behindStyle = behind.match(/style="([^"]+)"/)![1];
    expect(frontStyle).not.toBe(behindStyle);
  });

  it("omits an item image for a slot the scene doesn't mention", () => {
    const html = renderSceneHtml([{ slot: "vase", item: "book", position: 0 }]);
    expect(html.match(/<img/g)).toHaveLength(2); // room + vase item only
  });

  it("matches the pinned example end to end", () => {
    const html = renderSceneHtml(PINNED_SCENE);
    expect(html).toMatch(/src="[^"]*room\.svg[^"]*"/);
    expect(html).toMatch(/src="[^"]*hat\.svg[^"]*"/);
    expect(html).toMatch(/src="[^"]*key\.svg[^"]*"/);
    expect(html).toMatch(/src="[^"]*ball\.svg[^"]*"/);
  });
});
