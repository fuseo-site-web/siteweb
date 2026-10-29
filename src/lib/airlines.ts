/**
 * Compagnies aériennes : code IATA (2 caractères du numéro de vol) → nom et couleurs de la marque.
 * On n'utilise que des couleurs (pas de logos protégés) ; une compagnie inconnue reçoit une teinte stable dérivée de son code.
 */
export interface Airline {
  code: string;
  name: string;
  bg: string;
  fg: string;
  accent: string;
  /** Texte lisible posé sur la couleur d'accent. */
  accentFg: string;
}

const RAW: Record<string, [name: string, bg: string, accent: string]> = {
  AF: ['Air France', '#002157', '#ed1c24'],
  KL: ['KLM', '#00a1de', '#0b2f55'],
  LH: ['Lufthansa', '#05164d', '#ffad00'],
  BA: ['British Airways', '#075aaa', '#eb2226'],
  IB: ['Iberia', '#d7192d', '#f9b000'],
  VY: ['Vueling', '#ffcc00', '#3f3f3f'],
  U2: ['easyJet', '#ff6600', '#1f1f1f'],
  FR: ['Ryanair', '#073590', '#f1c933'],
  TO: ['Transavia', '#00b140', '#0b2240'],
  BF: ['French bee', '#5e2d79', '#e6007e'],
  SS: ['Corsair', '#d5202a', '#0b2240'],
  EK: ['Emirates', '#d71921', '#c8a96a'],
  QR: ['Qatar Airways', '#5c0632', '#c8a96a'],
  TK: ['Turkish Airlines', '#c8102e', '#8c0a1f'],
  EY: ['Etihad', '#bd8b13', '#2b2b2b'],
  SV: ['Saudia', '#006c35', '#1f1f1f'],
  SQ: ['Singapore Airlines', '#00266b', '#f9a01b'],
  CX: ['Cathay Pacific', '#005d63', '#8b8b8b'],
  NH: ['ANA', '#13448f', '#00a3e0'],
  JL: ['Japan Airlines', '#cc0000', '#1f1f1f'],
  KE: ['Korean Air', '#00256c', '#00a0df'],
  CA: ['Air China', '#c8102e', '#1f1f1f'],
  MU: ['China Eastern', '#0a3a8a', '#e2231a'],
  CZ: ['China Southern', '#0072bc', '#e2231a'],
  AI: ['Air India', '#c8102e', '#f3a333'],
  TG: ['Thai Airways', '#5d2a82', '#d4af37'],
  MH: ['Malaysia Airlines', '#00205b', '#e4002b'],
  GA: ['Garuda Indonesia', '#00a0b0', '#1f1f1f'],
  PR: ['Philippine Airlines', '#003da5', '#e4002b'],
  VN: ['Vietnam Airlines', '#0a5c9e', '#c9a227'],
  BR: ['EVA Air', '#00693e', '#f7941d'],
  QF: ['Qantas', '#e0002a', '#1f1f1f'],
  NZ: ['Air New Zealand', '#1a1a1a', '#9aa5b1'],
  DL: ['Delta', '#003366', '#c8102e'],
  AA: ['American Airlines', '#0078d2', '#c30019'],
  UA: ['United', '#0033a0', '#00a0dd'],
  AC: ['Air Canada', '#f01428', '#1f1f1f'],
  WN: ['Southwest', '#304cb2', '#ffbf27'],
  B6: ['JetBlue', '#003876', '#0099dd'],
  AS: ['Alaska Airlines', '#01426a', '#0099cc'],
  HA: ['Hawaiian Airlines', '#5e2d79', '#e6007e'],
  LA: ['LATAM', '#1b0088', '#e4002b'],
  AV: ['Avianca', '#da291c', '#1f1f1f'],
  AM: ['Aeroméxico', '#0b2265', '#e6a823'],
  VS: ['Virgin Atlantic', '#e10a0a', '#5a2d82'],
  EI: ['Aer Lingus', '#006272', '#00a99d'],
  SN: ['Brussels Airlines', '#0b1f5b', '#e4002b'],
  LX: ['Swiss', '#e30613', '#1f1f1f'],
  OS: ['Austrian', '#c8102e', '#1f1f1f'],
  TP: ['TAP Air Portugal', '#00a859', '#e4002b'],
  AZ: ['ITA Airways', '#0b2c5f', '#00a1de'],
  SK: ['SAS', '#000099', '#ff0000'],
  AY: ['Finnair', '#0b1560', '#7f9ee8'],
  LO: ['LOT', '#11397e', '#f7c300'],
  UX: ['Air Europa', '#1da1d6', '#d61f26'],
  AT: ['Royal Air Maroc', '#c1272d', '#00743f'],
  TU: ['Tunisair', '#d1202f', '#1f1f1f'],
  MS: ['EgyptAir', '#00205b', '#c8a96a'],
  ET: ['Ethiopian Airlines', '#007a33', '#ffc20e'],
  LY: ['El Al', '#1a2d6b', '#c8102e'],
};

/** Luminance relative (WCAG). */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Rapport de contraste WCAG entre deux couleurs hexadécimales. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const mix = (hex: string, to: number, t: number) =>
  `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + to * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

const INK = '#0b2240';
/** Texte (blanc ou encre) le plus lisible sur `bg` ; si 4,5:1 n'est pas atteint, le fond est légèrement assombri / éclairci. */
function readable(bg: string): { bg: string; fg: string } {
  const fg = contrast(bg, '#ffffff') >= contrast(bg, INK) ? '#ffffff' : INK;
  let adjusted = bg;
  for (let t = 0.06; contrast(adjusted, fg) < 4.5 && t < 0.9; t += 0.06) {
    adjusted = mix(bg, fg === '#ffffff' ? 0 : 255, t);
  }
  return { bg: adjusted, fg };
}

/** Teinte stable pour une compagnie inconnue. */
function hashColor(code: string) {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const l = 0.26;
  const a = 0.5 * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const FLIGHT = /^([A-Z][A-Z0-9]|[0-9][A-Z])\s?(\d{1,4}[A-Z]?)$/;

/** « AF276 » → compagnie Air France et numéro « AF 276 » ; null si le numéro n'est pas exploitable. */
export function parseFlight(flightNumber?: string | null) {
  const m = FLIGHT.exec((flightNumber ?? '').toUpperCase().trim());
  if (!m) return null;
  const code = m[1]!;
  const known = RAW[code];
  const head = readable(known?.[1] ?? hashColor(code));
  const pill = readable(known?.[2] ?? '#ffc857');
  const airline: Airline = {
    code,
    name: known?.[0] ?? code,
    bg: head.bg,
    fg: head.fg,
    accent: pill.bg,
    accentFg: pill.fg,
  };
  return { airline, display: `${code} ${m[2]}` };
}
