import { describe, expect, it } from 'vitest'
import { parseResumeText } from './resume-parser'

const SAMPLE_RESUME = `
张三
手机：13800138000
邮箱：zhangsan@example.com
求职意向：前端开发工程师

个人优势
熟悉 React、TypeScript 与 Electron 桌面开发。

工作经历
某互联网公司 | 前端工程师 | 2022.01-2024.06
负责职速达桌面端核心功能开发。

项目经历
职速达 MVP | 负责人
完成简历解析与本地存储模块。

教育经历
某某大学 | 计算机科学 | 本科 | 2018.09-2022.06

证书和荣誉
大学英语六级
`

describe('parseResumeText', () => {
  it('extracts basic info and sections from chinese resume text', () => {
    const parsed = parseResumeText(SAMPLE_RESUME)

    expect(parsed.basicInfo.name).toBe('张三')
    expect(parsed.basicInfo.phone).toBe('13800138000')
    expect(parsed.basicInfo.email).toBe('zhangsan@example.com')
    expect(parsed.basicInfo.jobIntention).toContain('前端开发工程师')
    expect(parsed.basicInfo.summary).toContain('React')
    expect(parsed.workExperiences.length).toBeGreaterThan(0)
    expect(parsed.projects.length).toBeGreaterThan(0)
    expect(parsed.educations.length).toBeGreaterThan(0)
    expect(parsed.certificates.length).toBeGreaterThan(0)
  })

  it('returns empty structure for blank text', () => {
    const parsed = parseResumeText('')

    expect(parsed.basicInfo.name).toBe('')
    expect(parsed.workExperiences).toEqual([])
  })
})

describe('parseResumeFile', () => {
  it('rejects unsupported file types', async () => {
    const { parseResumeFile } = await import('./resume-parser')
    await expect(parseResumeFile(Buffer.from('test'), 'resume.txt')).rejects.toThrow(
      '仅支持 PDF 和 Word 格式'
    )
  })
})
