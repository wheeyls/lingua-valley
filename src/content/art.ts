/**
 * SVG art for room backgrounds and NPC characters.
 *
 * Each background is a self-contained inline SVG string rendered behind the
 * room's entity cards. Each NPC avatar is an SVG that renders as the card icon.
 *
 * To replace with a real PNG/SVG asset, set the `art` field on the MapNpc to
 * the asset path — the renderer will use <img> instead of the inline SVG.
 *
 * Colors are designed to feel warm, cartoonish, and friendly.
 */

/** Street scene — sunny day, sidewalk, two house facades visible */
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
  <ellipse cx="220" cy="50" rx="30" ry="14" fill="white" opacity="0.7"/>
  <!-- Ground/road -->
  <rect y="155" width="400" height="65" fill="#9B8F7A"/>
  <rect y="155" width="400" height="8" fill="#7A6E60"/>
  <!-- Sidewalk -->
  <rect y="163" width="400" height="30" fill="#C8BFB0"/>
  <!-- Road markings -->
  <rect x="90" y="175" width="50" height="6" rx="3" fill="#FFF5" />
  <rect x="210" y="175" width="50" height="6" rx="3" fill="#FFF5" />
  <!-- House 1 — Your house (left) -->
  <rect x="20" y="80" width="100" height="80" fill="#E8D5B7"/>
  <rect x="20" y="80" width="100" height="80" fill="none" stroke="#9B7B4D" stroke-width="2"/>
  <!-- Roof 1 -->
  <polygon points="10,82 70,44 130,82" fill="#C0392B"/>
  <polygon points="10,82 70,44 130,82" fill="none" stroke="#96281B" stroke-width="2"/>
  <!-- Window 1 -->
  <rect x="35" y="100" width="22" height="22" rx="3" fill="#AED6F1" stroke="#9B7B4D" stroke-width="1.5"/>
  <line x1="46" y1="100" x2="46" y2="122" stroke="#9B7B4D" stroke-width="1"/>
  <line x1="35" y1="111" x2="57" y2="111" stroke="#9B7B4D" stroke-width="1"/>
  <!-- Door 1 -->
  <rect x="85" y="120" width="24" height="40" rx="4" fill="#7D5A3C" stroke="#5C3D1E" stroke-width="2"/>
  <circle cx="89" cy="141" r="2.5" fill="#FFD700"/>
  <!-- House label -->
  <text x="70" y="175" text-anchor="middle" font-size="9" fill="#5C3D1E" font-family="Trebuchet MS">Tu Casa</text>
  <!-- House 2 — Rosa's house (right) -->
  <rect x="265" y="75" width="115" height="85" fill="#F5CBA7"/>
  <rect x="265" y="75" width="115" height="85" fill="none" stroke="#BDC3C7" stroke-width="2"/>
  <!-- Roof 2 -->
  <polygon points="255,77 322,35 390,77" fill="#2980B9"/>
  <polygon points="255,77 322,35 390,77" fill="none" stroke="#1A5276" stroke-width="2"/>
  <!-- Window 2a -->
  <rect x="275" y="95" width="22" height="22" rx="3" fill="#AED6F1" stroke="#BDC3C7" stroke-width="1.5"/>
  <line x1="286" y1="95" x2="286" y2="117" stroke="#BDC3C7" stroke-width="1"/>
  <line x1="275" y1="106" x2="297" y2="106" stroke="#BDC3C7" stroke-width="1"/>
  <!-- Window 2b -->
  <rect x="350" y="95" width="22" height="22" rx="3" fill="#AED6F1" stroke="#BDC3C7" stroke-width="1.5"/>
  <line x1="361" y1="95" x2="361" y2="117" stroke="#BDC3C7" stroke-width="1"/>
  <line x1="350" y1="106" x2="372" y2="106" stroke="#BDC3C7" stroke-width="1"/>
  <!-- Door 2 -->
  <rect x="307" y="118" width="28" height="42" rx="5" fill="#8E44AD" stroke="#6C3483" stroke-width="2"/>
  <circle cx="312" cy="140" r="2.5" fill="#FFD700"/>
  <!-- Flower box -->
  <rect x="268" y="127" width="22" height="8" rx="2" fill="#7D5A3C"/>
  <circle cx="272" cy="124" r="4" fill="#E74C3C"/>
  <circle cx="280" cy="122" r="4" fill="#F39C12"/>
  <circle cx="288" cy="124" r="4" fill="#E74C3C"/>
  <!-- House label -->
  <text x="322" y="172" text-anchor="middle" font-size="9" fill="#5C3D1E" font-family="Trebuchet MS">Casa de Rosa</text>
  <!-- Path to door -->
  <rect x="307" y="160" width="28" height="3" fill="#BDC3C7"/>
  <!-- Ground details -->
  <circle cx="155" cy="168" r="3" fill="#7A6E60"/>
  <circle cx="165" cy="170" r="2" fill="#7A6E60"/>
  <circle cx="240" cy="167" r="2.5" fill="#7A6E60"/>
</svg>`;

/** Your home interior — cozy, warm, wooden floor */
export const HOME_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" style="width:100%;height:100%;display:block;">
  <!-- Wall -->
  <rect width="400" height="220" fill="#E8D5C0"/>
  <!-- Wallpaper pattern (subtle) -->
  <rect width="400" height="220" fill="none" stroke="#D4B896" stroke-width="0.5" opacity="0.3"/>
  <!-- Skirting board -->
  <rect y="180" width="400" height="8" fill="#A0785A"/>
  <!-- Floor -->
  <rect y="188" width="400" height="32" fill="#C4956A"/>
  <!-- Floor planks -->
  <line x1="0" y1="200" x2="400" y2="200" stroke="#A0785A" stroke-width="1" opacity="0.5"/>
  <line x1="0" y1="212" x2="400" y2="212" stroke="#A0785A" stroke-width="1" opacity="0.5"/>
  <line x1="60" y1="188" x2="60" y2="220" stroke="#A0785A" stroke-width="1" opacity="0.4"/>
  <line x1="140" y1="188" x2="140" y2="220" stroke="#A0785A" stroke-width="1" opacity="0.4"/>
  <line x1="220" y1="188" x2="220" y2="220" stroke="#A0785A" stroke-width="1" opacity="0.4"/>
  <line x1="310" y1="188" x2="310" y2="220" stroke="#A0785A" stroke-width="1" opacity="0.4"/>
  <!-- Window -->
  <rect x="140" y="20" width="120" height="90" rx="6" fill="#AED6F1" stroke="#7D5A3C" stroke-width="3"/>
  <line x1="200" y1="20" x2="200" y2="110" stroke="#7D5A3C" stroke-width="2"/>
  <line x1="140" y1="65" x2="260" y2="65" stroke="#7D5A3C" stroke-width="2"/>
  <!-- Window light glow -->
  <rect x="143" y="23" width="54" height="40" rx="3" fill="white" opacity="0.25"/>
  <rect x="203" y="23" width="54" height="40" rx="3" fill="white" opacity="0.15"/>
  <!-- Curtains -->
  <path d="M138,20 Q122,50 130,110" fill="#E74C3C" opacity="0.7"/>
  <path d="M262,20 Q278,50 270,110" fill="#E74C3C" opacity="0.7"/>
  <!-- Shelf -->
  <rect x="20" y="80" width="90" height="8" rx="2" fill="#A0785A"/>
  <rect x="20" y="80" width="90" height="8" rx="2" fill="none" stroke="#7D5A3C" stroke-width="1"/>
  <!-- Books on shelf -->
  <rect x="25" y="60" width="10" height="20" rx="1" fill="#E74C3C"/>
  <rect x="36" y="63" width="8" height="17" rx="1" fill="#3498DB"/>
  <rect x="45" y="58" width="12" height="22" rx="1" fill="#27AE60"/>
  <rect x="58" y="62" width="9" height="18" rx="1" fill="#F39C12"/>
  <rect x="68" y="64" width="10" height="16" rx="1" fill="#9B59B6"/>
  <!-- Small table -->
  <rect x="290" y="140" width="80" height="6" rx="2" fill="#A0785A"/>
  <rect x="298" y="146" width="6" height="34" rx="1" fill="#8A6244"/>
  <rect x="356" y="146" width="6" height="34" rx="1" fill="#8A6244"/>
  <!-- Plant on table -->
  <rect x="316" y="126" width="18" height="14" rx="2" fill="#C0392B"/>
  <ellipse cx="325" cy="126" rx="12" ry="8" fill="#27AE60"/>
  <ellipse cx="318" cy="130" rx="7" ry="5" fill="#2ECC71" transform="rotate(-20,318,130)"/>
  <ellipse cx="332" cy="130" rx="7" ry="5" fill="#2ECC71" transform="rotate(20,332,130)"/>
</svg>`;

/** Rosa's house interior — colorful, warm, Mexican-inspired */
export const PRACTICE_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" style="width:100%;height:100%;display:block;">
  <!-- Wall — warm terracotta -->
  <rect width="400" height="220" fill="#F0C27F"/>
  <!-- Tile pattern on lower wall (wainscoting) -->
  <rect y="150" width="400" height="70" fill="#E8956D"/>
  <rect y="150" width="400" height="4" fill="#C0392B"/>
  <!-- Tile grid -->
  <g stroke="#D4845A" stroke-width="0.5" opacity="0.5">
    <line x1="0" y1="165" x2="400" y2="165"/><line x1="0" y1="180" x2="400" y2="180"/>
    <line x1="0" y1="195" x2="400" y2="195"/><line x1="0" y1="210" x2="400" y2="210"/>
    <line x1="40" y1="150" x2="40" y2="220"/><line x1="80" y1="150" x2="80" y2="220"/>
    <line x1="120" y1="150" x2="120" y2="220"/><line x1="160" y1="150" x2="160" y2="220"/>
    <line x1="200" y1="150" x2="200" y2="220"/><line x1="240" y1="150" x2="240" y2="220"/>
    <line x1="280" y1="150" x2="280" y2="220"/><line x1="320" y1="150" x2="320" y2="220"/>
    <line x1="360" y1="150" x2="360" y2="220"/>
  </g>
  <!-- Decorative arch at top -->
  <path d="M0,0 Q200,-30 400,0 L400,40 Q200,10 0,40 Z" fill="#E8956D" opacity="0.4"/>
  <!-- Window left -->
  <rect x="20" y="25" width="80" height="95" rx="40" fill="#87CEEB" stroke="#7D5A3C" stroke-width="3"/>
  <line x1="60" y1="25" x2="60" y2="120" stroke="#7D5A3C" stroke-width="2"/>
  <line x1="20" y1="72" x2="100" y2="72" stroke="#7D5A3C" stroke-width="2"/>
  <rect x="23" y="28" rx="20" ry="20" width="35" height="42" fill="white" opacity="0.2"/>
  <!-- Window right -->
  <rect x="300" y="25" width="80" height="95" rx="40" fill="#87CEEB" stroke="#7D5A3C" stroke-width="3"/>
  <line x1="340" y1="25" x2="340" y2="120" stroke="#7D5A3C" stroke-width="2"/>
  <line x1="300" y1="72" x2="380" y2="72" stroke="#7D5A3C" stroke-width="2"/>
  <rect x="303" y="28" rx="20" ry="20" width="35" height="42" fill="white" opacity="0.2"/>
  <!-- Papel picado (decorative banner) -->
  <line x1="0" y1="15" x2="400" y2="15" stroke="#C0392B" stroke-width="1.5"/>
  <polygon points="20,15 28,30 12,30" fill="#E74C3C"/>
  <polygon points="50,15 58,30 42,30" fill="#F39C12"/>
  <polygon points="80,15 88,30 72,30" fill="#27AE60"/>
  <polygon points="110,15 118,30 102,30" fill="#3498DB"/>
  <polygon points="140,15 148,30 132,30" fill="#9B59B6"/>
  <polygon points="170,15 178,30 162,30" fill="#E74C3C"/>
  <polygon points="200,15 208,30 192,30" fill="#F39C12"/>
  <polygon points="230,15 238,30 222,30" fill="#27AE60"/>
  <polygon points="260,15 268,30 252,30" fill="#E74C3C"/>
  <polygon points="290,15 298,30 282,30" fill="#3498DB"/>
  <polygon points="320,15 328,30 312,30" fill="#9B59B6"/>
  <polygon points="350,15 358,30 342,30" fill="#F39C12"/>
  <polygon points="380,15 388,30 372,30" fill="#27AE60"/>
  <!-- Potted plant left bottom -->
  <rect x="115" y="128" width="24" height="22" rx="3" fill="#C0392B"/>
  <rect x="112" y="125" width="30" height="5" rx="2" fill="#A93226"/>
  <ellipse cx="127" cy="125" rx="18" ry="12" fill="#27AE60"/>
  <ellipse cx="116" cy="130" rx="10" ry="7" fill="#2ECC71" transform="rotate(-25,116,130)"/>
  <ellipse cx="138" cy="130" rx="10" ry="7" fill="#2ECC71" transform="rotate(25,138,130)"/>
  <!-- Potted plant right bottom -->
  <rect x="261" y="128" width="24" height="22" rx="3" fill="#8E44AD"/>
  <rect x="258" y="125" width="30" height="5" rx="2" fill="#6C3483"/>
  <ellipse cx="273" cy="125" rx="18" ry="12" fill="#27AE60"/>
  <ellipse cx="262" cy="130" rx="10" ry="7" fill="#2ECC71" transform="rotate(-25,262,130)"/>
  <ellipse cx="284" cy="130" rx="10" ry="7" fill="#2ECC71" transform="rotate(25,284,130)"/>
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

/** House facade SVG for door cards on the street */
export const HOUSE_DOOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70">
  <rect x="5" y="20" width="50" height="50" rx="3" fill="#E8D5B7"/>
  <polygon points="0,22 30,2 60,22" fill="#C0392B"/>
  <rect x="18" y="42" width="24" height="28" rx="4" fill="#7D5A3C"/>
  <circle cx="22" cy="57" r="2.5" fill="#FFD700"/>
  <rect x="32" y="32" width="14" height="14" rx="2" fill="#87CEEB"/>
  <line x1="39" y1="32" x2="39" y2="46" stroke="#A0785A" stroke-width="1"/>
  <line x1="32" y1="39" x2="46" y2="39" stroke="#A0785A" stroke-width="1"/>
</svg>`;

export const LOCKED_DOOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70">
  <rect x="5" y="20" width="50" height="50" rx="3" fill="#555"/>
  <polygon points="0,22 30,2 60,22" fill="#444"/>
  <rect x="18" y="42" width="24" height="28" rx="4" fill="#333"/>
  <circle cx="22" cy="57" r="2.5" fill="#888"/>
  <circle cx="30" cy="32" r="10" fill="none" stroke="#888" stroke-width="3"/>
  <rect x="25" y="30" width="10" height="14" rx="2" fill="#888"/>
  <circle cx="30" cy="37" r="2" fill="#555"/>
</svg>`;
