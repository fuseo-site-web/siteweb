/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

import { wrap24 } from '../constants';

const OSC_DEFAULTS = Object.freeze({
  mu: 0.23,
  q: 1 / 3,
  k: 0.55,
  tauX: 24.2,
  alpha0: 0.05,
  beta: 0.013 /* min^-1 */,
  G: 19.875,
  p: 0.5,
  I0: 9500,
  cbtOffsetH: -0.1,
  lightSensitivity: 1,
});
/** dérivées ; t en heures, I en lux (0 si yeux fermés) */
function deriv(x, xc, n, I, P, out) {
  const alpha =
    I > 0 ? P.alpha0 * (P.p === 0.5 ? Math.sqrt(I / P.I0) : Math.pow(I / P.I0, P.p)) : 0;
  const Bhat = P.G * (1 - n) * alpha * P.lightSensitivity;
  const B = Bhat * (1 - 0.4 * x) * (1 - 0.4 * xc);
  const w = Math.PI / 12;
  const x3 = x * x * x,
    x7 = x3 * x3 * x;
  out[0] = w * (xc + P.mu * (x / 3 + (4 / 3) * x3 - (256 / 105) * x7) + B);
  out[1] = w * (P.q * B * xc - x * ((24 / (0.99729 * P.tauX)) ** 2 + P.k * B));
  out[2] = 60 * (alpha * (1 - n) - P.beta * n);
}
const k1 = [0, 0, 0],
  k2 = [0, 0, 0],
  k3 = [0, 0, 0],
  k4 = [0, 0, 0];
/** Un pas RK4 de dt heures, lumière constante I sur le pas. Modifie s en place. */
function stepOscillator(s, I, dt, P) {
  const { x, xc, n } = s;
  deriv(x, xc, n, I, P, k1);
  deriv(x + (dt / 2) * k1[0], xc + (dt / 2) * k1[1], n + (dt / 2) * k1[2], I, P, k2);
  deriv(x + (dt / 2) * k2[0], xc + (dt / 2) * k2[1], n + (dt / 2) * k2[2], I, P, k3);
  deriv(x + dt * k3[0], xc + dt * k3[1], n + dt * k3[2], I, P, k4);
  const th0 = Math.atan2(xc, x);
  s.x = x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
  s.xc = xc + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  s.n = n + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  let d = th0 - Math.atan2(s.xc, s.x);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  s.psi += (d * 12) / Math.PI;
}
/** Heures écoulées depuis le dernier CBTmin estimé par le modèle, dans [0,24). */
function hoursSinceCbtMin(s, P) {
  const th = Math.atan2(s.xc, s.x);
  let a = Math.PI - th;
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return wrap24((a * 12) / Math.PI - P.cbtOffsetH);
}
function amplitude(s) {
  return Math.hypot(s.x, s.xc);
}
/** Fait tourner l'état de `hours` heures circadiennes (sans changer l'amplitude). hours>0 = avance de phase. */
function rotatePhase(s, hours) {
  const r = Math.hypot(s.x, s.xc),
    th = Math.atan2(s.xc, s.x) - (hours * Math.PI) / 12;
  s.x = r * Math.cos(th);
  s.xc = r * Math.sin(th);
  s.psi += hours;
}

export { OSC_DEFAULTS, stepOscillator, hoursSinceCbtMin, amplitude, rotatePhase };
