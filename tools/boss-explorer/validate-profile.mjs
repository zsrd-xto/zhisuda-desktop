#!/usr/bin/env node
/**
 * 校验 seed-profile-v1.json 的 JSONPath / fieldMap 与样例响应一致。
 * 用法：node tools/boss-explorer/validate-profile.mjs
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const projectRoot = join(import.meta.dirname, '..', '..')
const seedPath = join(projectRoot, 'docs/boss-dom/seed-profile-v1.json')
const listSamplePath = join(projectRoot, 'docs/boss-dom/network/recommend-job-list.sample.json')
const detailSamplePath = join(projectRoot, 'docs/boss-dom/network/job-detail.sample.json')

function queryJsonPath(data, path) {
  const normalized = path.startsWith('$.') ? path.slice(2) : path
  if (!normalized) return data
  let current = data
  for (const segment of normalized.split('.')) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = current[segment]
  }
  return current
}

function mapJsonFields(source, fieldMap) {
  const result = {}
  for (const [targetKey, sourcePath] of Object.entries(fieldMap)) {
    if (sourcePath.startsWith('__template__:')) continue
    result[targetKey] = queryJsonPath(source, sourcePath)
  }
  return result
}

function applyTemplate(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = context[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

function resolveFieldMap(item, fieldMap) {
  const mapped = mapJsonFields(item, fieldMap)
  const jobUrlTemplate = fieldMap.jobUrl
  if (jobUrlTemplate?.startsWith('__template__:')) {
    mapped.jobUrl = applyTemplate(jobUrlTemplate.replace('__template__:', ''), item)
  }
  return mapped
}

function assertPath(data, path, label) {
  const value = queryJsonPath(data, path)
  if (value === undefined) {
    throw new Error(`${label}: JSON 路径无效 → ${path}`)
  }
  return value
}

function validateListProfile(recipe, sample) {
  const api = recipe.api
  if (!api) return

  const list = assertPath(sample, api.listJsonPath ?? 'zpData.jobList', 'job_list')
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('job_list: 样例列表为空')
  }

  const first = resolveFieldMap(list[0], api.fieldMap)
  const required = ['id', 'title', 'salary', 'city', 'companyName', 'securityId']
  for (const key of required) {
    if (!first[key]) {
      throw new Error(`job_list: fieldMap 缺少 ${key}（路径 ${api.fieldMap[key]}）`)
    }
  }

  if (api.hasMorePath) {
    assertPath(sample, api.hasMorePath, 'job_list hasMore')
  }
}

function validateDetailProfile(recipe, sample) {
  const api = recipe.api
  if (!api) return

  const root = assertPath(sample, api.detailJsonPath ?? 'zpData', 'job_detail')
  const mapped = resolveFieldMap(root, api.fieldMap)
  const required = ['id', 'title', 'responsibilities', 'companyName', 'companyScale']
  for (const key of required) {
    if (!mapped[key]) {
      throw new Error(`job_detail: fieldMap 缺少 ${key}（路径 ${api.fieldMap[key]}）`)
    }
  }
}

function validateDomProfile(recipe, label) {
  if (!recipe.dom) return
  if (!recipe.dom.itemSelector) {
    throw new Error(`${label}: dom.itemSelector 未配置`)
  }
  if (!recipe.dom.fieldMap || Object.keys(recipe.dom.fieldMap).length === 0) {
    throw new Error(`${label}: dom.fieldMap 未配置`)
  }
}

function main() {
  for (const file of [seedPath, listSamplePath, detailSamplePath]) {
    if (!existsSync(file)) {
      console.error('未找到文件:', file)
      process.exit(1)
    }
  }

  const seed = JSON.parse(readFileSync(seedPath, 'utf-8'))
  const listSample = JSON.parse(readFileSync(listSamplePath, 'utf-8'))
  const detailSample = JSON.parse(readFileSync(detailSamplePath, 'utf-8'))

  const byType = Object.fromEntries(seed.profiles.map((p) => [p.pageType, p]))

  validateListProfile(byType.job_list.recipe, listSample)
  validateDetailProfile(byType.job_detail.recipe, detailSample)
  validateDomProfile(byType.job_list.recipe, 'job_list')
  validateDomProfile(byType.job_detail.recipe, 'job_detail')

  const prereqSlots = ['resume_upload', 'resume_manage', 'chat']
  for (const slot of prereqSlots) {
    if (!byType[slot]) {
      throw new Error(`预研槽位缺失: ${slot}`)
    }
  }

  if (!byType.job_detail.recipe.actions?.apply) {
    throw new Error('预研槽位缺失: job_detail.actions.apply')
  }

  console.log(`校验通过：${seed.profiles.length} 条 PageProfile`)
  console.log('- job_list API fieldMap 与 recommend-job-list.sample.json 一致')
  console.log('- job_detail API fieldMap 与 job-detail.sample.json 一致')
  console.log('- 预研槽位 resume_upload / resume_manage / chat / apply 已配置')
}

try {
  main()
} catch (error) {
  console.error('校验失败:', error instanceof Error ? error.message : error)
  process.exit(1)
}
