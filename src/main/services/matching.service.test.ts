import { describe, expect, it } from 'vitest'
import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'
import type { JobDetail } from '../../shared/types/platform'
import {
  computeMatchBreakdown,
  parseCompanyScaleHeadcount,
  parseRegisteredCapitalWan,
  passesFilter,
  passesSalaryMinFilter,
  rankJobs,
  scoreCompanyBenefits,
  scoreCompanyScale,
  scoreRegisteredCapital,
  scoreResponsibilityKeywords,
  titleJaccardScore
} from './matching.service'

const baseCriteria: FetchCriteriaSnapshot = {
  preferenceId: 'p1',
  name: 'AI应用开发·深圳·20-25K',
  targetPosition: 'AI应用开发',
  titleMatchThreshold: 20,
  targetCity: '深圳',
  salaryMin: 20,
  salaryMax: 25,
  fetchQuery: 'AI应用开发',
  fetchCity: '深圳',
  fetchSalaryMin: 20,
  industries: [],
  companySizes: [],
  requireInsurance: true,
  requireWeekendOff: false,
  excludeOutsource: false,
  blacklistCompanies: [],
  excludeKeywords: ['销售'],
  responsibilityKeywords: ['大模型', 'RAG']
}

function makeJob(overrides: Partial<JobDetail> = {}): JobDetail {
  return {
    id: 'job-1',
    title: 'AI应用开发工程师',
    salary: '20-25K',
    city: '深圳·南山区',
    jobUrl: 'https://example.com/job',
    companyName: '示例科技',
    ...overrides
  }
}

describe('matching.service', () => {
  it('scores title with bigram Jaccard', () => {
    const score = titleJaccardScore('AI应用开发工程师', 'AI应用开发')
    expect(score).toBeGreaterThan(20)
  })

  it('matches short query as substring in title', () => {
    expect(titleJaccardScore('Java高级工程师', 'JAVA')).toBe(100)
    expect(passesFilter(makeJob({ title: 'Java后端开发' }), { ...baseCriteria, fetchQuery: 'JAVA' })).toBe(
      true
    )
  })

  it('rejects jobs below title threshold', () => {
    expect(
      passesFilter(makeJob({ title: '销售经理' }), { ...baseCriteria, titleMatchThreshold: 20 })
    ).toBe(false)
  })

  it('rejects jobs below salary min', () => {
    expect(passesSalaryMinFilter('15-18K', 20)).toBe(false)
    expect(passesFilter(makeJob({ salary: '15-18K' }), baseCriteria)).toBe(false)
  })

  it('rejects blacklist and exclude keywords', () => {
    expect(
      passesFilter(makeJob({ companyName: '黑名单公司科技' }), {
        ...baseCriteria,
        blacklistCompanies: ['黑名单公司']
      })
    ).toBe(false)

    expect(passesFilter(makeJob({ title: 'AI销售开发' }), baseCriteria)).toBe(false)
  })

  it('scores responsibility keywords +10 per hit', () => {
    expect(
      scoreResponsibilityKeywords(
        makeJob({ responsibilities: '负责大模型与RAG应用开发' }),
        ['大模型', 'RAG']
      )
    ).toBe(20)
  })

  it('scores company scale tiers', () => {
    expect(parseCompanyScaleHeadcount('15-20人')).toBe(20)
    expect(scoreCompanyScale('15-20人')).toBe(10)
    expect(scoreCompanyScale('100-499人')).toBe(20)
    expect(scoreCompanyScale('')).toBe(0)
  })

  it('scores registered capital tiers', () => {
    expect(parseRegisteredCapitalWan('1000万人民币')).toBe(1000)
    expect(scoreRegisteredCapital('1000万人民币')).toBe(20)
    expect(scoreRegisteredCapital('50万元')).toBe(10)
    expect(scoreRegisteredCapital('5万元')).toBe(-10)
  })

  it('scores company benefits', () => {
    expect(
      scoreCompanyBenefits(
        makeJob({
          benefits: ['五险一金', '双休', '包吃住'],
          responsibilities: '日常开发'
        })
      )
    ).toBe(40)
  })

  it('computes additive total score', () => {
    const breakdown = computeMatchBreakdown(
      makeJob({
        responsibilities: '大模型 RAG 开发',
        companyScale: '100-499人',
        registeredCapital: '1000万人民币',
        benefits: ['五险一金', '双休']
      }),
      baseCriteria
    )

    expect(breakdown.keyword).toBe(20)
    expect(breakdown.companyScale).toBe(20)
    expect(breakdown.companyCapital).toBe(20)
    expect(breakdown.companyBenefits).toBe(20)
    expect(breakdown.total).toBe(80)
  })

  it('ranks jobs by total score descending', () => {
    const jobs = rankJobs(
      [
        makeJob({
          id: 'low',
          title: 'AI应用开发',
          salary: '20-25K',
          responsibilities: '基础开发'
        }),
        makeJob({
          id: 'high',
          title: 'AI应用开发工程师',
          salary: '22-28K',
          responsibilities: '大模型 RAG 开发',
          companyScale: '100-499人',
          registeredCapital: '500万元',
          benefits: ['五险一金', '双休']
        })
      ],
      baseCriteria
    )

    expect(jobs[0].id).toBe('high')
    expect(jobs[0].matchScore).toBeGreaterThan(jobs[1].matchScore)
  })
})
