/**
 * SVG art for the hub background and NPC characters.
 *
 * The background is a self-contained inline SVG string rendered behind the
 * hub's NPC pins. Each background also embeds invisible anchor markers
 * (`<circle id="...">`) that `content/maps.ts`'s buildHubMap resolves —
 * a Location's `anchor` field names one of these ids, so the art is the
 * single source of truth for where each pin sits.
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
  <!-- Anchor markers — invisible, mark where each Location's hub pin sits.
       id matches Location.anchor in world.ts (PUEBLO_DEL_AYER). -->
  <circle id="seed-farm" cx="60" cy="125" r="1" fill="none"/>
  <circle id="plaza" cx="200" cy="180" r="1" fill="none"/>
  <circle id="store" cx="260" cy="175" r="1" fill="none"/>
  <circle id="the-woods" cx="345" cy="120" r="1" fill="none"/>
  <circle id="the-room" cx="130" cy="190" r="1" fill="none"/>
</svg>`;

/** Park scene — Daphne's birthday campaign: ramada, bandshell, playground,
 *  splashpad, duck pond. Anchor markers (invisible, id matches Location.anchor
 *  in world.ts's FIESTA_DE_DAPHNE) mark where each hub pin sits. */
export const PARK_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" style="width:100%;height:100%;display:block;">
  <!-- Sky strip -->
  <rect width="400" height="28" fill="#87CEEB"/>
  <circle cx="360" cy="18" r="14" fill="#FFD700" opacity="0.9"/>
  <!-- Grass -->
  <rect y="24" width="400" height="196" fill="#A8C686"/>
  <!-- Winding path -->
  <path d="M0,140 Q90,120 180,150 T400,130" stroke="#C8BFB0" stroke-width="16" fill="none" opacity="0.55"/>
  <!-- Ambient trees -->
  <circle cx="20" cy="60" r="20" fill="#4A7C59" opacity="0.6"/>
  <rect x="17" y="60" width="6" height="18" fill="#7D5A3C" opacity="0.6"/>
  <circle cx="390" cy="200" r="18" fill="#5A8F5A" opacity="0.5"/>
  <rect x="387" y="200" width="6" height="16" fill="#7D5A3C" opacity="0.5"/>

  <!-- La Ramada: shaded picnic shelter, upper-left -->
  <ellipse cx="90" cy="72" rx="52" ry="20" fill="#8a7a6a" opacity="0.35"/>
  <rect x="52" y="70" width="6" height="26" fill="#7D5A3C"/>
  <rect x="124" y="70" width="6" height="26" fill="#7D5A3C"/>
  <rect x="46" y="62" width="88" height="8" rx="3" fill="#9c8b78"/>
  <circle cx="90" cy="85" r="4" fill="#F4C542" opacity="0.9"/>

  <!-- El Escenario: bandshell, upper-right -->
  <path d="M280,90 A34,34 0 0 1 348,90 Z" fill="#7d6f8f" opacity="0.7"/>
  <rect x="286" y="90" width="56" height="10" fill="#5c5270"/>

  <!-- El Parque Infantil: playground with slide, lower-left -->
  <polygon points="46,178 92,178 60,150" fill="#E76F51" opacity="0.85"/>
  <rect x="42" y="176" width="8" height="18" fill="#8a8a8a"/>
  <circle cx="100" cy="182" r="7" fill="#3D5A80" opacity="0.8"/>
  <circle cx="118" cy="182" r="7" fill="#3D5A80" opacity="0.8"/>

  <!-- El Chapoteadero: splashpad, lower-center -->
  <ellipse cx="200" cy="188" rx="44" ry="18" fill="#7EC8E3" opacity="0.85"/>
  <path d="M180,182 q4,-8 8,0" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
  <path d="M200,180 q4,-8 8,0" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
  <path d="M220,182 q4,-8 8,0" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>

  <!-- El Estanque de los Patos: duck pond, lower-right -->
  <ellipse cx="335" cy="180" rx="46" ry="22" fill="#4A90A4" opacity="0.85"/>
  <ellipse cx="320" cy="176" rx="9" ry="6" fill="white"/>
  <circle cx="311" cy="171" r="4" fill="white"/>
  <polygon points="306,171 300,172 306,174" fill="#F4A300"/>
  <ellipse cx="345" cy="185" rx="9" ry="6" fill="#7D5A3C"/>
  <circle cx="354" cy="180" r="4" fill="#7D5A3C"/>
  <polygon points="359,180 365,181 359,183" fill="#F4A300"/>

  <!-- Small flowers -->
  <circle cx="150" cy="205" r="2.5" fill="#E74C3C" opacity="0.6"/>
  <circle cx="250" cy="60" r="2.5" fill="#9B59B6" opacity="0.5"/>

  <!-- Anchor markers -->
  <circle id="la-ramada" cx="90" cy="85" r="1" fill="none"/>
  <circle id="el-escenario" cx="310" cy="90" r="1" fill="none"/>
  <circle id="el-parque-infantil" cx="70" cy="175" r="1" fill="none"/>
  <circle id="el-chapoteadero" cx="200" cy="185" r="1" fill="none"/>
  <circle id="el-estanque-de-los-patos" cx="330" cy="175" r="1" fill="none"/>
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

/** Small round "portrait" avatar for map pins — head/face only, no torso or
 *  initial-letter caption (the marker label below the pin already carries
 *  the name). Designed to stay legible at ~30-44px. */
export function npcThumbnailSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
    <!-- Face, cropped tight (no torso) -->
    <circle cx="30" cy="30" r="28" fill="${color}"/>
    <circle cx="30" cy="30" r="24" fill="${lighten(color)}"/>
    <!-- Eyes — larger/simpler than npcAvatarSvg's so they hold up small -->
    <circle cx="21" cy="27" r="4.5" fill="white"/>
    <circle cx="39" cy="27" r="4.5" fill="white"/>
    <circle cx="22" cy="28" r="2.5" fill="#1a1423"/>
    <circle cx="40" cy="28" r="2.5" fill="#1a1423"/>
    <!-- Smile -->
    <path d="M19,37 Q30,45 41,37" stroke="#1a1423" stroke-width="2.5" fill="none" stroke-linecap="round"/>
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
