// 2D affine matrices in Pixi's convention: x' = a*x + c*y + tx, y' = b*x + d*y + ty.
// Angles are degrees; y is down.

export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export const DEG = Math.PI / 180;

export const IDENTITY: Readonly<Mat> = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

/** Translate · Rotate · Scale. */
export function fromTRS(x: number, y: number, rotation: number, scaleX = 1, scaleY = 1): Mat {
  const cos = Math.cos(rotation * DEG);
  const sin = Math.sin(rotation * DEG);
  return { a: cos * scaleX, b: sin * scaleX, c: -sin * scaleY, d: cos * scaleY, tx: x, ty: y };
}

/** p · l (apply l first, then p). */
export function multiply(p: Mat, l: Mat): Mat {
  return {
    a: p.a * l.a + p.c * l.b,
    b: p.b * l.a + p.d * l.b,
    c: p.a * l.c + p.c * l.d,
    d: p.b * l.c + p.d * l.d,
    tx: p.a * l.tx + p.c * l.ty + p.tx,
    ty: p.b * l.tx + p.d * l.ty + p.ty,
  };
}

export function invert(m: Mat): Mat {
  const det = m.a * m.d - m.b * m.c || 1e-9;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    tx: (m.c * m.ty - m.d * m.tx) / det,
    ty: (m.b * m.tx - m.a * m.ty) / det,
  };
}

export function apply(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m.a * x + m.c * y + m.tx, y: m.b * x + m.d * y + m.ty };
}

/** World rotation of the matrix's x axis, in degrees. */
export function rotationOf(m: Mat): number {
  return Math.atan2(m.b, m.a) / DEG;
}

export function rotate(x: number, y: number, degrees: number): [number, number] {
  const c = Math.cos(degrees * DEG);
  const s = Math.sin(degrees * DEG);
  return [x * c - y * s, x * s + y * c];
}

/** Wraps to (-180, 180] and rounds to 0.1°. */
export function normalizeAngle(degrees: number): number {
  const a = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return Math.round(a * 10) / 10;
}
