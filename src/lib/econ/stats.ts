export type Point = { date: string; value: number };

export type SeriesBundle = {
  id: string;
  meta?: any;
  points: Point[];
};

export function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function fmtNum(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(3).replace(/\.?0+$/, "");
}

export function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

export function fmtRate(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

export function computeLatest(points: Point[]) {
  const p = points[points.length - 1];
  return p ?? { date: "", value: NaN };
}

export function computeDiff(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < points.length; i++) {
    out.push({ date: points[i].date, value: points[i].value - points[i - 1].value });
  }
  return out;
}

export function computePctChange(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].value;
    const b = points[i].value;
    if (a === 0) continue;
    out.push({ date: points[i].date, value: (b / a) - 1 });
  }
  return out;
}

export function computeYoY(points: Point[]): Point[] {
  // assumes monthly or quarterly; uses 12-period lag for “YoY-like” comparison.
  const out: Point[] = [];
  for (let i = 12; i < points.length; i++) {
    const a = points[i - 12].value;
    const b = points[i].value;
    if (a === 0) continue;
    out.push({ date: points[i].date, value: (b / a) - 1 });
  }
  return out;
}

export function computeZScore(points: Point[]): Point[] {
  const vals = points.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (vals.length < 5) return points.map((p) => ({ ...p, value: NaN }));
  const mean = vals.reduce((s, x) => s + x, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (vals.length - 1));
  if (!Number.isFinite(sd) || sd === 0) return points.map((p) => ({ ...p, value: NaN }));
  return points.map((p) => ({ date: p.date, value: (p.value - mean) / sd }));
}

export function computeRollingMean(points: Point[], window: number): Point[] {
  const w = Math.max(2, Math.floor(window));
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - w + 1);
    const slice = points.slice(start, i + 1).map((p) => p.value).filter((v) => Number.isFinite(v));
    if (slice.length < w) continue;
    const mean = slice.reduce((s, x) => s + x, 0) / slice.length;
    out.push({ date: points[i].date, value: mean });
  }
  return out;
}

export function computeRollingVol(points: Point[], window: number): Point[] {
  // rolling stdev of diffs
  const diffs = computeDiff(points);
  const w = Math.max(2, Math.floor(window));
  const out: Point[] = [];
  for (let i = 0; i < diffs.length; i++) {
    const start = Math.max(0, i - w + 1);
    const slice = diffs.slice(start, i + 1).map((p) => p.value).filter((v) => Number.isFinite(v));
    if (slice.length < w) continue;
    const mean = slice.reduce((s, x) => s + x, 0) / slice.length;
    const sd = Math.sqrt(slice.reduce((s, x) => s + (x - mean) ** 2, 0) / (slice.length - 1));
    out.push({ date: diffs[i].date, value: sd });
  }
  return out;
}

export function alignByDate(series: { id: string; points: Point[] }[]) {
  // build map date -> {date, id1, id2, ...}
  const maps = series.map((s) => {
    const m = new Map<string, number>();
    for (const p of s.points) m.set(p.date, p.value);
    return { id: s.id, map: m };
  });

  const dates = new Set<string>();
  for (const s of maps) for (const d of s.map.keys()) dates.add(d);

  const sorted = Array.from(dates).sort();
  const rows: any[] = [];
  for (const d of sorted) {
    const row: any = { date: d };
    let ok = true;
    for (const s of maps) {
      const v = s.map.get(d);
      if (!Number.isFinite(Number(v))) {
        ok = false;
        break;
      }
      row[s.id] = v;
    }
    if (ok) rows.push(row);
  }
  return rows;
}

// ---- Correlation ----
function corr(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 5) return NaN;
  const am = a.reduce((s, x) => s + x, 0) / n;
  const bm = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - am;
    const xb = b[i] - bm;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? NaN : num / den;
}

export function computeCorrelationMatrix(
  series: { id: string; title: string; points: Point[] }[]
) {
  const aligned = alignByDate(series.map((s) => ({ id: s.id, points: s.points })));
  if (aligned.length < 10) return null;

  const labels = series.map((s) => ({ id: s.id, title: s.title }));
  const matrix: number[][] = [];
  for (let i = 0; i < series.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < series.length; j++) {
      const a = aligned.map((r) => Number(r[series[i].id]));
      const b = aligned.map((r) => Number(r[series[j].id]));
      row.push(corr(a, b));
    }
    matrix.push(row);
  }

  return { labels, matrix };
}

// ---- OLS regression ----
export type OLSResult = {
  n: number;
  coef: Record<string, number>;
  tstat: Record<string, number>;
  r2: number;
  residuals: number[];
};

function transpose(A: number[][]) {
  return A[0].map((_, i) => A.map((r) => r[i]));
}

function matMul(A: number[][], B: number[][]) {
  const out: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    out[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let s = 0;
      for (let k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
      out[i][j] = s;
    }
  }
  return out;
}

// simple Gauss-Jordan inverse for small matrices
function invert(M: number[][]) {
  const n = M.length;
  const A = M.map((r) => r.slice());
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let i = 0; i < n; i++) {
    // pivot
    let pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) {
      // swap
      let swapped = false;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(A[r][i]) > 1e-12) {
          [A[i], A[r]] = [A[r], A[i]];
          [I[i], I[r]] = [I[r], I[i]];
          pivot = A[i][i];
          swapped = true;
          break;
        }
      }
      if (!swapped) return null;
    }

    const invPivot = 1 / pivot;
    for (let j = 0; j < n; j++) {
      A[i][j] *= invPivot;
      I[i][j] *= invPivot;
    }

    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i];
      for (let j = 0; j < n; j++) {
        A[r][j] -= f * A[i][j];
        I[r][j] -= f * I[i][j];
      }
    }
  }
  return I;
}

export function computeOLS(y: number[], Xcols: number[][], colNames: string[]): OLSResult {
  const n = y.length;
  const k = Xcols.length;

  // X = [1, x1, x2, ...]
  const X: number[][] = Array.from({ length: n }, (_, i) => {
    const row = [1];
    for (let j = 0; j < k; j++) row.push(Xcols[j][i]);
    return row;
  });

  const Y = y.map((v) => [v]);

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const inv = invert(XtX);
  if (!inv) {
    return { n, coef: {}, tstat: {}, r2: NaN, residuals: [] };
  }
  const XtY = matMul(Xt, Y);
  const B = matMul(inv, XtY).map((r) => r[0]); // coefficients

  // predictions & residuals
  const yHat: number[] = [];
  const resid: number[] = [];
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let j = 0; j < B.length; j++) pred += X[i][j] * B[j];
    yHat.push(pred);
    resid.push(y[i] - pred);
  }

  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = resid.reduce((s, v) => s + v ** 2, 0);
  const r2 = ssTot === 0 ? NaN : 1 - ssRes / ssTot;

  // stderr & t-stats (classic)
  const df = n - (k + 1);
  const sigma2 = df > 0 ? ssRes / df : NaN;

  // var(B) = sigma^2 * inv(X'X)
  const coef: Record<string, number> = {};
  const tstat: Record<string, number> = {};

  const names = ["intercept", ...colNames];
  for (let j = 0; j < B.length; j++) {
    const se = Number.isFinite(sigma2) ? Math.sqrt(sigma2 * inv[j][j]) : NaN;
    coef[names[j]] = B[j];
    tstat[names[j]] = Number.isFinite(se) && se !== 0 ? B[j] / se : NaN;
  }

  return { n, coef, tstat, r2, residuals: resid };
}