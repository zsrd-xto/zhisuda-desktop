import { describe, expect, it } from 'vitest'
import { parseSalaryRangeK } from './job-filter'

describe('job-filter', () => {
  it('re-exports parseSalaryRangeK from matching.service', () => {
    expect(parseSalaryRangeK('20-25K')).toEqual({ min: 20, max: 25 })
    expect(parseSalaryRangeK('25K以上')).toEqual({ min: 25, max: 75 })
  })
})
