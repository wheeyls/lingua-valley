/**
 * SVG art for the hub background and NPC characters.
 *
 * The background is a self-contained inline SVG string rendered behind the
 * hub's NPC cards. Each NPC avatar is an SVG that renders as the card icon.
 *
 * To replace with a real PNG/SVG asset, set the `art` field on the MapNpc to
 * the asset path — the renderer will use <img> instead of the inline SVG.
 *
 * Colors are designed to feel warm, cartoonish, and friendly.
 */

/** Street scene — generic outdoor/street, no houses (those are clickable cards) */
export const STREET_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" style="width:100%;height:100%;display:block;">
  <!-- Sky -->
  <rect width="400" height="220" fill="#87CEEB"/>
  <!-- Sun -->
  <circle cx="340" cy="40" r="28" fill="#FFE08A" opacity="0.9"/>
  <circle cx="340" cy="40" r="22" fill="#FFD700"/>
  <!-- Clouds -->
  <ellipse cx="80" cy="35" rx="38" ry="18" fill="white" opacity="0.85"/>
  <ellipse cx="108" cy="30" rx="26" ry="16" fill="white" opacity="0.85"/>
  <ellipse cx="58" cy="30" rx="22" ry="14" fill="white" opacity="0.85"/>
  <ellipse cx="250" cy="50" rx="30" ry="14" fill="white" opacity="0.7"/>
  <!-- Distant mountains -->
  <polygon points="0,140 60,80 120,140" fill="#6B8F71" opacity="0.4"/>
  <polygon points="80,140 160,60 240,140" fill="#5A7D62" opacity="0.35"/>
  <polygon points="200,140 300,70 400,140" fill="#6B8F71" opacity="0.4"/>
  <!-- Trees (background) -->
  <circle cx="50" cy="120" r="22" fill="#4A7C59" opacity="0.7"/>
  <rect x="47" y="120" width="6" height="20" fill="#7D5A3C" opacity="0.7"/>
  <circle cx="350" cy="115" r="26" fill="#4A7C59" opacity="0.6"/>
  <rect x="347" y="115" width="6" height="25" fill="#7D5A3C" opacity="0.6"/>
  <circle cx="180" cy="125" r="18" fill="#5A8F5A" opacity="0.5"/>
  <rect x="177" y="125" width="6" height="15" fill="#7D5A3C" opacity="0.5"/>
  <!-- Ground -->
  <rect y="140" width="400" height="80" fill="#A8C686"/>
  <!-- Path/sidewalk -->
  <rect y="170" width="400" height="28" rx="4" fill="#C8BFB0" opacity="0.7"/>
  <rect y="170" width="400" height="5" fill="#B5AC9E" opacity="0.4"/>
  <!-- Ground details -->
  <circle cx="30" cy="155" r="3" fill="#8FB86A" opacity="0.5"/>
  <circle cx="100" cy="160" r="2" fill="#8FB86A" opacity="0.5"/>
  <circle cx="280" cy="152" r="2.5" fill="#8FB86A" opacity="0.5"/>
  <circle cx="370" cy="158" r="2" fill="#8FB86A" opacity="0.5"/>
  <!-- Small flowers -->
  <circle cx="70" cy="150" r="3" fill="#E74C3C" opacity="0.6"/>
  <circle cx="310" cy="148" r="3" fill="#F39C12" opacity="0.6"/>
  <circle cx="150" cy="155" r="2.5" fill="#9B59B6" opacity="0.5"/>
</svg>`;

// --- NPC character SVGs ---
// Each returns an SVG string for use as a card icon.
// The color param lets us tint the character to match the NPC's color.

export function npcAvatarSvg(color: string, initial: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">
    <!-- Body/torso -->
    <ellipse cx="30" cy="62" rx="18" ry="14" fill="${color}" opacity="0.9"/>
    <!-- Head -->
    <circle cx="30" cy="32" r="20" fill="${color}"/>
    <circle cx="30" cy="32" r="18" fill="${lighten(color)}"/>
    <!-- Eyes -->
    <circle cx="23" cy="29" r="3.5" fill="white"/>
    <circle cx="37" cy="29" r="3.5" fill="white"/>
    <circle cx="24" cy="30" r="2" fill="#1a1423"/>
    <circle cx="38" cy="30" r="2" fill="#1a1423"/>
    <circle cx="24.5" cy="29.5" r="0.7" fill="white"/>
    <circle cx="38.5" cy="29.5" r="0.7" fill="white"/>
    <!-- Smile -->
    <path d="M22,37 Q30,44 38,37" stroke="#1a1423" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Initial letter -->
    <text x="30" y="70" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="Trebuchet MS" opacity="0.9">${initial}</text>
  </svg>`;
}

function lighten(hex: string): string {
  // Lighten a hex color by ~20% for the face highlight
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 40);
  const g = Math.min(255, ((n >> 8) & 0xff) + 40);
  const b = Math.min(255, (n & 0xff) + 40);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}
