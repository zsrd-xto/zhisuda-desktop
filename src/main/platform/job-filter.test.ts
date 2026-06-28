import { describe, expect, it } from 'vitest'
import { filterJobsByCriteria, parseSalaryRangeK } from './job-filter'
import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'

const baseCriteria: FetchCriteriaSnapshot = {
  preferenceId: 'p1',
  name: 'AI应用开发·深圳·20-25K',
  targetPosition: 'AI应用开发',
  targetCity: '深圳',
  salaryMin: 20,
  salaryMax: 25,
  industries: [],
  companySizes: [],
  requireInsurance: true,
  requireWeekendOff: false,
  excludeOutsource: true,
  blacklistCompanies: [],
  excludeKeywords: ['销售']
}

describe('job-filter', () => {
  it('parses salary ranges', () => {
    expect(parseSalaryRangeK('20-25K')).toEqual({ min: 20, max: 25 })
    expect(parseSalaryRangeK('25K以上')).toEqual({ min: 25, max: 75 })
  })

  it('keeps matching jobs', () => {
    const jobs = filterJobsByCriteria(
      [
        {
          title: 'AI应用开发工程师',
          city: '深圳·南山区',
          salary: '20-25K',
          companyName: '示例科技'
        },
        {
          title: 'Java开发',
          city: '深圳',
          salary: '15-18K',
          companyName: '某公司'
        }
      ],
      baseCriteria
    )

    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toContain('AI应用开发')
  })
})
