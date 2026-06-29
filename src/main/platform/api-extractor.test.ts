import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  assertBossApiResponse,
  buildListUrl,
  hasMorePages,
  parseDetailItem,
  parseListItems
} from './api-extractor'
import type { PageRecipeApi } from './types'

const root = join(process.cwd(), 'docs/boss-dom')
const listSample = JSON.parse(
  readFileSync(join(root, 'network/recommend-job-list.sample.json'), 'utf-8')
) as Record<string, unknown>
const detailSample = JSON.parse(
  readFileSync(join(root, 'network/job-detail.sample.json'), 'utf-8')
) as Record<string, unknown>

const listApi: PageRecipeApi = {
  listUrl: 'https://www.zhipin.com/wapi/zpgeek/pc/recommend/job/list.json',
  listJsonPath: 'zpData.jobList',
  hasMorePath: 'zpData.hasMore',
  fieldMap: {
    id: 'encryptJobId',
    title: 'jobName',
    salary: 'salaryDesc',
    city: 'cityName',
    companyName: 'brandName',
    companyScale: 'brandScaleName',
    benefits: 'welfareList',
    securityId: 'securityId',
    jobUrl: '__template__:https://www.zhipin.com/job_detail/{encryptJobId}.html'
  },
  pagination: { param: 'page', startPage: 1, maxPages: 3 }
}

const detailApi: PageRecipeApi = {
  detailUrl: 'https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId={securityId}',
  detailJsonPath: 'zpData',
  fieldMap: {
    id: 'jobInfo.encryptId',
    title: 'jobInfo.jobName',
    salary: 'jobInfo.salaryDesc',
    city: 'jobInfo.locationName',
    responsibilities: 'jobInfo.postDescription',
    benefits: 'jobInfo.showSkills',
    companyName: 'brandComInfo.brandName',
    companyType: 'brandComInfo.stageName',
    companyScale: 'brandComInfo.scaleName',
    registeredCapital: 'brandComInfo.regCapital'
  }
}

describe('api-extractor', () => {
  it('parses recommend job list sample', () => {
    const json = assertBossApiResponse({ ok: true, status: 200, json: listSample })
    const items = parseListItems(json, listApi)

    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('前端开发工程师')
    expect(items[0].securityId).toBe('sample_security_id_001')
    expect(items[0].jobUrl).toContain('sample_job_id_001')
    expect(hasMorePages(json, listApi)).toBe(true)
  })

  it('parses job detail sample', () => {
    const json = assertBossApiResponse({ ok: true, status: 200, json: detailSample })
    const detail = parseDetailItem(json, detailApi)

    expect(detail.title).toBe('前端开发工程师')
    expect(detail.responsibilities).toContain('Web 前端开发')
    expect(detail.companyScale).toBe('100-499人')
  })

  it('maps Boss rate limit code to RATE_LIMIT', () => {
    expect(() =>
      assertBossApiResponse({
        ok: true,
        status: 200,
        json: { code: 36, message: 'too frequent' }
      })
    ).toThrowError(/验证/)
  })

  it('builds search list URL without duplicate query params', () => {
    const searchApi: PageRecipeApi = {
      listUrl:
        'https://www.zhipin.com/wapi/zpgeek/search/joblist.json?page={page}&pageSize=15&city={city}&query={query}',
      fieldMap: { id: 'encryptJobId', title: 'jobName' },
      queryParams: { city: '101280100', query: 'Java' },
      pagination: { param: 'page', startPage: 1, maxPages: 3 }
    }

    const url = buildListUrl(searchApi, 2)
    expect(url).toBe(
      'https://www.zhipin.com/wapi/zpgeek/search/joblist.json?page=2&pageSize=15&city=101280100&query=Java'
    )
    expect(url.match(/page=/g)).toHaveLength(1)
    expect(url.match(/city=/g)).toHaveLength(1)
    expect(url.match(/query=/g)).toHaveLength(1)
  })
})
