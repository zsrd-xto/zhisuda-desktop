import { describe, expect, it } from 'vitest'
import { queryJsonPath, resolveFieldMap } from './json-path'

describe('json-path', () => {
  it('reads nested paths', () => {
    const data = { zpData: { jobList: [{ jobName: '前端' }] } }
    expect(queryJsonPath(data, 'zpData.jobList')).toHaveLength(1)
    expect(queryJsonPath(data, 'zpData.jobList.0.jobName')).toBe('前端')
  })

  it('resolves field map with template url', () => {
    const item = { encryptJobId: 'abc123', jobName: '测试' }
    const mapped = resolveFieldMap(item, {
      title: 'jobName',
      jobUrl: '__template__:https://www.zhipin.com/job_detail/{encryptJobId}.html'
    })
    expect(mapped.title).toBe('测试')
    expect(mapped.jobUrl).toBe('https://www.zhipin.com/job_detail/abc123.html')
  })
})
