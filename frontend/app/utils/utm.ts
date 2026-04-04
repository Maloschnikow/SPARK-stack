// UTM / MGRS coordinate utilities — WGS84 (EPSG:4326)

const a = 6_378_137.0
const f = 1 / 298.257_223_563
const e2 = 2 * f - f * f
const k0 = 0.999_6

/** UTM zone number (1–60) for a given longitude. */
export function getZoneNumber(lng: number): number {
  return Math.floor(((lng + 180) % 360) / 6) + 1
}

/** MGRS latitude-band letter (C–X) for a given latitude. */
export function getZoneLetter(lat: number): string {
  if (lat < -80 || lat > 84) return ''
  return 'CDEFGHJKLMNPQRSTUVWX'[Math.min(Math.floor((lat + 80) / 8), 19)] ?? ''
}

export interface UtmResult {
  easting: number
  northing: number
  zone: number
  hemi: 'N' | 'S'
}

/** Convert WGS84 lat/lng → UTM. */
export function latLngToUtm(lat: number, lng: number): UtmResult {
  const φ = (lat * Math.PI) / 180
  const zone = getZoneNumber(lng)
  const λ0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180
  const λ = (lng * Math.PI) / 180

  const sinφ = Math.sin(φ), cosφ = Math.cos(φ), tanφ = Math.tan(φ)
  const e4 = e2 * e2, e6 = e4 * e2

  const N_ = a / Math.sqrt(1 - e2 * sinφ * sinφ)
  const T = tanφ * tanφ
  const C = (e2 / (1 - e2)) * cosφ * cosφ
  const A_ = cosφ * (λ - λ0)

  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * φ -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * φ) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * φ) -
      ((35 * e6) / 3072) * Math.sin(6 * φ))

  const A2 = A_ * A_, A3 = A2 * A_, A4 = A3 * A_, A5 = A4 * A_, A6 = A5 * A_

  const easting =
    k0 *
      N_ *
      (A_ +
        ((1 - T + C) * A3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - (58 * e2) / (1 - e2)) * A5) / 120) +
    500_000

  let northing =
    k0 *
    (M +
      N_ *
        tanφ *
        (A2 / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - (330 * e2) / (1 - e2)) * A6) / 720))

  if (lat < 0) northing += 10_000_000

  return { easting, northing, zone, hemi: lat >= 0 ? 'N' : 'S' }
}

/** Convert UTM → WGS84 lat/lng. */
export function utmToLatLng(
  easting: number,
  northing: number,
  zone: number,
  hemi: 'N' | 'S',
): { lat: number; lng: number } {
  const y = hemi === 'S' ? northing - 10_000_000 : northing
  const x = easting - 500_000
  const λ0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180

  const m = y / k0
  const μ = m / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256))
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2))
  const e1b = e1 * e1, e1c = e1b * e1, e1d = e1c * e1

  const φ1 =
    μ +
    ((3 * e1) / 2 - (27 * e1c) / 32) * Math.sin(2 * μ) +
    ((21 * e1b) / 16 - (55 * e1d) / 32) * Math.sin(4 * μ) +
    ((151 * e1c) / 96) * Math.sin(6 * μ) +
    ((1097 * e1d) / 512) * Math.sin(8 * μ)

  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), tanφ1 = Math.tan(φ1)
  const N1 = a / Math.sqrt(1 - e2 * sinφ1 * sinφ1)
  const T1 = tanφ1 * tanφ1
  const C1 = (e2 / (1 - e2)) * cosφ1 * cosφ1
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinφ1 * sinφ1, 1.5)
  const D = x / (N1 * k0)
  const D2 = D * D, D3 = D2 * D, D4 = D3 * D, D5 = D4 * D, D6 = D5 * D

  const φ =
    φ1 -
    ((N1 * tanφ1) / R1) *
      (D2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - (9 * e2) / (1 - e2)) * D4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - (252 * e2) / (1 - e2) - 3 * C1 * C1) * D6) / 720)

  const λ =
    λ0 +
    (D -
      ((1 + 2 * T1 + C1) * D3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + (8 * e2) / (1 - e2) + 24 * T1 * T1) * D5) / 120) /
      cosφ1

  return { lat: (φ * 180) / Math.PI, lng: (λ * 180) / Math.PI }
}

// ─── MGRS 100 km square letters ────────────────────────────────────────────

const COL_SETS = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'] as const
const ROW_ODD  = 'ABCDEFGHJKLMNPQRSTUV'   // odd zones  (1, 3, 5 …)
const ROW_EVEN = 'FGHJKLMNPQRSTUVABCDE'   // even zones (2, 4, 6 …)

/** Two-letter MGRS 100 km square ID for a given zone + UTM easting + northing. */
export function mgrs100kId(zone: number, easting: number, northing: number): string {
  const col = Math.floor(easting / 100_000) - 1          // 0 – 7
  const row = Math.floor(northing / 100_000) % 20        // 0 – 19
  const colLetter = (COL_SETS[(zone - 1) % 3]?.[col]) ?? '?'
  const rowLetter = (zone % 2 === 1 ? ROW_ODD : ROW_EVEN)[row] ?? '?'
  return colLetter + rowLetter
}

/**
 * Format a WGS84 position as MGRS string.
 * precision 1 = 10 km, 2 = 1 km, 3 = 100 m, 4 = 10 m, 5 = 1 m
 */
export function latLngToMgrs(lat: number, lng: number, precision: 1 | 2 | 3 | 4 | 5 = 5): string {
  if (lat < -80 || lat > 84) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const utm    = latLngToUtm(lat, lng)
  const letter = getZoneLetter(lat)
  const sq     = mgrs100kId(utm.zone, utm.easting, utm.northing)
  const div    = Math.pow(10, 5 - precision)
  const eStr   = Math.floor((utm.easting  % 100_000) / div).toString().padStart(precision, '0')
  const nStr   = Math.floor((utm.northing % 100_000) / div).toString().padStart(precision, '0')
  return `${utm.zone}${letter} ${sq} ${eStr} ${nStr}`
}

// ─── Grid generation ────────────────────────────────────────────────────────

export type GridKind = 'gzd' | '100k' | 'sub'

export interface GridLineFeature {
  type: 'Feature'
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  properties: { kind: GridKind; label: string }
}

export interface GridLabelFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { label: string; kind: GridKind }
}

export interface GridOptions {
  showGzd: boolean
  show100k: boolean
  subInterval: number      // metres; 0 = disabled
  showLabels: boolean
}

/** Suitable grid levels for a given zoom. */
export function autoGridOptions(zoom: number): Pick<GridOptions, 'show100k' | 'subInterval'> {
  if (zoom < 7)  return { show100k: false, subInterval: 0 }
  if (zoom < 9)  return { show100k: true,  subInterval: 0 }
  if (zoom < 12) return { show100k: true,  subInterval: 10_000 }
  if (zoom < 14) return { show100k: true,  subInterval: 1_000 }
  if (zoom < 17) return { show100k: true,  subInterval: 100 }
  return              { show100k: true,  subInterval: 10 }
}

// Internal: emit UTM grid lines for one zone slice.
function addUtmLines(
  zone: number, hemi: 'N' | 'S',
  minE: number, maxE: number, minN: number, maxN: number,
  interval: number,
  clipW: number, clipE: number, clipS: number, clipN: number,
  kind: GridKind,
  lines: GridLineFeature[],
  labels: GridLabelFeature[],
  showLabels: boolean,
): void {
  const steps = interval >= 100_000 ? 20 : interval >= 10_000 ? 8 : 3

  // Number of significant digits shown on sub-grid line labels:
  // 10 km→1 digit, 1 km→2, 100 m→3, 10 m→4
  const labelDigits = interval < 100_000 ? Math.round(Math.log10(100_000 / interval)) : 0
  const subLabel = (coord: number) =>
    Math.floor((coord % 100_000) / interval).toString().padStart(labelDigits, '0')

  // Easting lines (roughly vertical on the map)
  const firstE = Math.ceil(minE / interval) * interval
  for (let E = firstE; E <= maxE + 0.5; E += interval) {
    if (E < 100_001 || E > 899_999) continue
    const coords: [number, number][] = []
    for (let s = 0; s <= steps; s++) {
      const N = minN + ((maxN - minN) * s) / steps
      try {
        const ll = utmToLatLng(E, N, zone, hemi)
        if (ll.lat >= clipS - 0.05 && ll.lat <= clipN + 0.05 && ll.lng >= clipW - 0.05 && ll.lng <= clipE + 0.05)
          coords.push([ll.lng, ll.lat])
      } catch { /* outside valid range */ }
    }
    if (coords.length >= 2)
      lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { kind, label: kind === 'sub' ? subLabel(E) : '' } })
  }

  // Northing lines (roughly horizontal on the map)
  const firstN = Math.ceil(minN / interval) * interval
  for (let N = firstN; N <= maxN + 0.5; N += interval) {
    const coords: [number, number][] = []
    for (let s = 0; s <= steps; s++) {
      const E = minE + ((maxE - minE) * s) / steps
      if (E < 100_001 || E > 899_999) continue
      try {
        const ll = utmToLatLng(E, N, zone, hemi)
        if (ll.lat >= clipS - 0.05 && ll.lat <= clipN + 0.05 && ll.lng >= clipW - 0.05 && ll.lng <= clipE + 0.05)
          coords.push([ll.lng, ll.lat])
      } catch { /* outside valid range */ }
    }
    if (coords.length >= 2)
      lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { kind, label: kind === 'sub' ? subLabel(N) : '' } })
  }

  // One label per 100 km square (at geographic centre of the square)
  if (showLabels && kind === '100k') {
    const firstSqE = Math.ceil(minE / 100_000) * 100_000
    const firstSqN = Math.ceil(minN / 100_000) * 100_000
    for (let sqE = firstSqE; sqE <= maxE; sqE += 100_000) {
      for (let sqN = firstSqN; sqN <= maxN; sqN += 100_000) {
        try {
          const ll = utmToLatLng(sqE + 50_000, sqN + 50_000, zone, hemi)
          if (ll.lat >= clipS && ll.lat <= clipN && ll.lng >= clipW && ll.lng <= clipE) {
            labels.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] },
              properties: { label: mgrs100kId(zone, sqE, sqN), kind: '100k' },
            })
          }
        } catch { /* skip */ }
      }
    }
  }
}

/**
 * Build the complete grid GeoJSON for a viewport.
 *
 * Returns:
 *   lines       — LineStrings (kind: gzd | 100k | sub)
 *   labelPoints — Points      (kind: gzd | 100k)
 */
export function buildGrid(
  west: number, south: number, east: number, north: number,
  options: GridOptions,
): {
  lines: { type: 'FeatureCollection'; features: GridLineFeature[] }
  labelPoints: { type: 'FeatureCollection'; features: GridLabelFeature[] }
} {
  const lines:  GridLineFeature[]  = []
  const labels: GridLabelFeature[] = []

  const S = Math.max(south, -80),  N = Math.min(north,  84)
  const W = Math.max(west,  -180), E = Math.min(east,   180)
  if (S >= N || W >= E) return empty()

  // ── GZD (Grid Zone Designator) boundary lines ───────────────────────────
  if (options.showGzd) {
    // Meridians every 6°
    const firstMeridian = Math.ceil((W + 180) / 6) * 6 - 180
    for (let lng = firstMeridian; lng <= E + 0.001; lng += 6) {
      if (lng < W || lng > E) continue
      lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[lng, S], [lng, N]] }, properties: { kind: 'gzd', label: '' } })
    }

    // Latitude parallels (MGRS bands 8° wide, last band 72°–84° = 12°)
    for (const lat of [-80, -72, -64, -56, -48, -40, -32, -24, -16, -8, 0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 84]) {
      if (lat < S || lat > N) continue
      lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[W, lat], [E, lat]] }, properties: { kind: 'gzd', label: '' } })
    }

    // GZD labels at cell centres
    if (options.showLabels) {
      const bands   = 'CDEFGHJKLMNPQRSTUVWX'
      const minZone = Math.floor((W + 180) / 6) + 1
      const maxZone = Math.ceil((E + 180) / 6)
      for (let z = minZone; z <= maxZone; z++) {
        const lngC = (z - 1) * 6 - 180 + 3
        if (lngC < W || lngC > E) continue
        const minBi = Math.max(0, Math.floor((S + 80) / 8))
        const maxBi = Math.min(19, Math.ceil((N + 80) / 8) - 1)
        for (let bi = minBi; bi <= maxBi; bi++) {
          const latC = bi * 8 - 80 + 4
          if (latC < S || latC > N) continue
          labels.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lngC, latC] },
            properties: { label: `${z}${bands[bi] ?? ''}`, kind: 'gzd' },
          })
        }
      }
    }
  }

  // ── UTM sub-grid (100 km squares and finer) ────────────────────────────
  const toRender: Array<{ m: number; kind: GridKind }> = []
  if (options.show100k) toRender.push({ m: 100_000, kind: '100k' })
  if (options.subInterval > 0 && options.subInterval < 100_000)
    toRender.push({ m: options.subInterval, kind: 'sub' })

  if (toRender.length > 0) {
    const minZ = getZoneNumber(W)
    const maxZ = getZoneNumber(E)

    for (let zone = minZ; zone <= maxZ; zone++) {
      const zoneLngW = (zone - 1) * 6 - 180
      const zoneLngE = zone * 6 - 180
      const clipW = Math.max(W, zoneLngW)
      const clipE_zone = Math.min(E, zoneLngE)
      if (clipW >= clipE_zone) continue

      // Split viewport at equator so hemisphere is unambiguous
      const slices: Array<{ hemi: 'N' | 'S'; hS: number; hN: number }> =
        S >= 0  ? [{ hemi: 'N', hS: S, hN: N }]
        : N <= 0 ? [{ hemi: 'S', hS: S, hN: N }]
        :          [{ hemi: 'S', hS: S, hN: 0 }, { hemi: 'N', hS: 0, hN: N }]

      for (const { hemi, hS, hN } of slices) {
        if (hS >= hN) continue
        const safS = Math.max(hS, -79.9), safN = Math.min(hN, 83.9)

        // Viewport corners → UTM to get easting/northing range
        const corners = [
          latLngToUtm(safS, clipW), latLngToUtm(safS, clipE_zone),
          latLngToUtm(safN, clipW), latLngToUtm(safN, clipE_zone),
        ]
        const minE_utm = Math.max(Math.min(...corners.map(c => c.easting)),  100_001)
        const maxE_utm = Math.min(Math.max(...corners.map(c => c.easting)),  899_999)
        const minN_utm = Math.min(...corners.map(c => c.northing))
        const maxN_utm = Math.max(...corners.map(c => c.northing))
        if (minE_utm >= maxE_utm) continue

        for (const { m, kind } of toRender) {
          addUtmLines(
            zone, hemi,
            minE_utm, maxE_utm, minN_utm, maxN_utm, m,
            clipW, clipE_zone, hS, hN,
            kind, lines, labels, options.showLabels,
          )
        }
      }
    }
  }

  return {
    lines:       { type: 'FeatureCollection', features: lines },
    labelPoints: { type: 'FeatureCollection', features: labels },
  }
}

function empty() {
  return {
    lines:       { type: 'FeatureCollection' as const, features: [] as GridLineFeature[] },
    labelPoints: { type: 'FeatureCollection' as const, features: [] as GridLabelFeature[] },
  }
}
