import { describe, it, expect } from 'vitest'
import {
    convertToCrisp,
    normalizeMatrix,
    calculateOutput,
    calculateHgodIndex,
    rankPatients,
    runFullHgo,
    WEIGHTS,
    TYPES,
} from './hgo.js'

const SAMPLE_PATIENTS = [
    { id: '1', patient_code: 'P000001', name: 'Alice', Cr1: 'independent', Cr2: 'no', Cr3: 'vvip', Cr4: 'emergency', Cr5: 'critical', Cr6: 'abnormal' },
    { id: '2', patient_code: 'P000002', name: 'Bob', Cr1: 'governance insurance', Cr2: 'yes', Cr3: 'class3', Cr4: 'urgent', Cr5: 'mild', Cr6: 'normal' },
]

describe('convertToCrisp', () => {
    it('insurance independent → 100', () => expect(convertToCrisp('Cr1', 'independent')).toBe(100))
    it('insurance bpjs → 50', () => expect(convertToCrisp('Cr1', 'bpjs')).toBe(50))
    it('surgery no → 100', () => expect(convertToCrisp('Cr2', 'no')).toBe(100))
    it('surgery yes → 50', () => expect(convertToCrisp('Cr2', 'yes')).toBe(50))
    it('room vvip → 100', () => expect(convertToCrisp('Cr3', 'vvip')).toBe(100))
    it('room class3 → 20', () => expect(convertToCrisp('Cr3', 'class3')).toBe(20))
    it('admission emergency → 100', () => expect(convertToCrisp('Cr4', 'emergency')).toBe(100))
    it('severity critical → 100', () => expect(convertToCrisp('Cr5', 'critical')).toBe(100))
    it('test_result abnormal → 100', () => expect(convertToCrisp('Cr6', 'abnormal')).toBe(100))
    it('unknown value throws', () => expect(() => convertToCrisp('Cr1', 'xyz')).toThrow())
    it('unknown criterion throws', () => expect(() => convertToCrisp('Cr99', 'any')).toThrow())
})

describe('normalizeMatrix', () => {
    const matrix = [
        { Cr1: 100, Cr2: 100, Cr3: 80, Cr4: 100, Cr5: 100, Cr6: 100 },
        { Cr1: 50, Cr2: 50, Cr3: 20, Cr4: 50, Cr5: 25, Cr6: 50 },
    ]
    const normed = normalizeMatrix(matrix, TYPES)

    it('positive Cr1 row0 = 1.0', () => expect(normed[0].Cr1).toBeCloseTo(1.0))
    it('positive Cr1 row1 = 0.5', () => expect(normed[1].Cr1).toBeCloseTo(0.5))
    it('negative Cr2 row0 = 0.5', () => expect(normed[0].Cr2).toBeCloseTo(0.5))
    it('negative Cr2 row1 = 1.0', () => expect(normed[1].Cr2).toBeCloseTo(1.0))
    it('empty matrix returns []', () => expect(normalizeMatrix([])).toEqual([]))
})

describe('calculateOutput', () => {
    it('all-ones row = sum of weights', () => {
        const row = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 1.0]))
        const expected = Object.values(WEIGHTS).reduce((s, w) => s + w, 0)
        expect(calculateOutput(row)).toBeCloseTo(expected)
    })
    it('all-zeros row = 0', () => {
        const row = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0]))
        expect(calculateOutput(row)).toBe(0)
    })
})

describe('calculateHgodIndex', () => {
    it('high crisp → low index', () => {
        const high = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 100]))
        const low = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 25]))
        expect(calculateHgodIndex(high)).toBeLessThan(calculateHgodIndex(low))
    })
})

describe('rankPatients', () => {
    it('lowest hgodIndex gets rank 1', () => {
        const input = [
            { patientId: 'B', hgodIndex: 0.02, outputScore: 0.8 },
            { patientId: 'A', hgodIndex: 0.01, outputScore: 0.9 },
        ]
        const ranked = rankPatients(input)
        expect(ranked[0].patientId).toBe('A')
        expect(ranked[0].rank).toBe(1)
    })

    it('assigns priority levels', () => {
        const items = Array.from({ length: 8 }, (_, i) => ({ patientId: String(i), hgodIndex: i + 1, outputScore: 1 }))
        const ranked = rankPatients(items)
        expect(ranked[0].priorityLevel).toBe('Critical')
        expect(ranked[ranked.length - 1].priorityLevel).toBe('Low')
    })
})

describe('runFullHgo', () => {
    it('processes two patients', () => {
        const results = runFullHgo(SAMPLE_PATIENTS)
        expect(results).toHaveLength(2)
        expect(results[0].rank).toBe(1)
        expect(results[1].rank).toBe(2)
        results.forEach((r) => {
            expect(r).toHaveProperty('outputScore')
            expect(r).toHaveProperty('hgodIndex')
            expect(r).toHaveProperty('priorityLevel')
        })
    })
    it('empty input returns []', () => expect(runFullHgo([])).toEqual([]))
    it('Alice (max scores) ranks #1', () => {
        const results = runFullHgo(SAMPLE_PATIENTS)
        const alice = results.find((r) => r.patientId === '1')
        expect(alice.rank).toBe(1)
    })
})
