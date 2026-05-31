/**
 * Back-compat barrel. Pure tokens now live in src/ui/tokens.ts (framework-free)
 * and Phaser widgets in src/ui/widgets.ts. Scenes may import from here.
 *
 * IMPORTANT: the pure UI layout abstraction (src/ui/layouts/*) and its tests
 * import from ui/tokens directly, NOT this file, so they never pull in Phaser.
 */

export * from "../ui/tokens";
export { makeButton, type ButtonHandle, type ButtonOptions } from "../ui/widgets";
