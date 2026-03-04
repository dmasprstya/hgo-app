/**
 * HGO Discovery — JavaScript implementation (mirrors Python hgo.py exactly)
 * Used for frontend transparency simulation view and Jest/Vitest unit tests.
 */

export const CRISP_MAP = {
    Cr1: { 'governance insurance': 50, bpjs: 50, independent: 100, mandiri: 100 },
    Cr2: { no: 100, tidak: 100, yes: 50, ya: 50 },
    Cr3: { class3: 20, kelas3: 20, class2: 40, kelas2: 40, class1: 60, kelas1: 60, vip: 80, vvip: 100 },
    Cr4: { urgent: 50, emergency: 100, darurat: 100 },
    Cr5: { mild: 25, ringan: 25, moderate: 50, sedang: 50, severe: 75, berat: 75, critical: 100, kritis: 100 },
    Cr6: { normal: 50, abnormal: 100 },
}

export const WEIGHTS = { Cr1: 0.10, Cr2: 0.20, Cr3: 0.075, Cr4: 0.125, Cr5: 0.20, Cr6: 0.15 }
export const TYPES = { Cr1: 'positive', Cr2: 'negative', Cr3: 'positive', Cr4: 'positive', Cr5: 'positive', Cr6: 'positive' }
export const ORDER = ['Cr1', 'Cr2', 'Cr3', 'Cr4', 'Cr5', 'Cr6']

/** Stage H — Convert raw string value to crisp number */
export function convertToCrisp(criterionCode, rawValue) {
    const mapping = CRISP_MAP[criterionCode]
    if (!mapping) throw new Error(`Unknown criterion: ${criterionCode}`)
    const key = String(rawValue).trim().toLowerCase()
    if (!(key in mapping)) throw new Error(`Unknown value '${rawValue}' for ${criterionCode}`)
    return mapping[key]
}

/** Stage G — Normalize matrix */
export function normalizeMatrix(matrix, types = TYPES) {
    if (!matrix.length) return []
    const codes = Object.keys(matrix[0])
    const colMax = {}
    const colMin = {}
    codes.forEach((code) => {
        const vals = matrix.map((r) => r[code])
        colMax[code] = Math.max(...vals)
        colMin[code] = Math.min(...vals)
    })
    return matrix.map((row) => {
        const norm = {}
        codes.forEach((code) => {
            const x = row[code]
            const t = types[code] || 'positive'
            norm[code] = t === 'positive'
                ? (colMax[code] !== 0 ? x / colMax[code] : 0)
                : (x !== 0 ? colMin[code] / x : 0)
        })
        return norm
    })
}

/** Stage O — Weighted sum */
export function calculateOutput(normalizedRow, weights = WEIGHTS) {
    return Object.entries(normalizedRow).reduce(
        (sum, [code, val]) => sum + (weights[code] || 0) * val,
        0
    )
}

/** Stage O — HGOd Index = 1 / Σ(Wj × Xj) using crisp values */
export function calculateHgodIndex(crispRow, weights = WEIGHTS) {
    const ws = Object.entries(crispRow).reduce(
        (sum, [code, val]) => sum + (weights[code] || 0) * val,
        0
    )
    return ws !== 0 ? 1 / ws : Infinity
}

/** Rank by HGOd Index ascending */
export function rankPatients(results) {
    const sorted = [...results].sort((a, b) => a.hgodIndex - b.hgodIndex)
    const total = sorted.length
    return sorted.map((r, i) => {
        const pct = (i + 1) / total
        const priorityLevel =
            pct <= 0.25 ? 'Critical' : pct <= 0.50 ? 'High' : pct <= 0.75 ? 'Medium' : 'Low'
        return { ...r, rank: i + 1, priorityLevel }
    })
}

/** Full HGO pipeline */
export function runFullHgo(patients) {
    if (!patients.length) return []

    const crispRows = patients.map((p) => {
        const row = {}
        ORDER.forEach((code) => { row[code] = convertToCrisp(code, p[code]) })
        return row
    })

    const normalizedRows = normalizeMatrix(crispRows, TYPES)

    const results = patients.map((p, i) => ({
        patientId: p.id,
        patientCode: p.patient_code,
        patientName: p.name,
        outputScore: calculateOutput(normalizedRows[i], WEIGHTS),
        hgodIndex: calculateHgodIndex(crispRows[i], WEIGHTS),
        _crisp: crispRows[i],
        _normalized: normalizedRows[i],
    }))

    return rankPatients(results)
}
