/**
 * 轻量 JSON 路径查询，支持 `zpData.jobList` 与 `$.zpData.jobList`。
 */
export function queryJsonPath(data: unknown, path: string): unknown {
  const normalized = path.startsWith('$.') ? path.slice(2) : path
  if (!normalized) {
    return data
  }

  const segments = normalized.split('.')
  let current: unknown = data

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

export function mapJsonFields(
  source: unknown,
  fieldMap: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [targetKey, sourcePath] of Object.entries(fieldMap)) {
    if (sourcePath.startsWith('__template__:')) {
      continue
    }
    result[targetKey] = queryJsonPath(source, sourcePath)
  }

  return result
}

export function applyTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = context[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

export function resolveFieldMap(
  item: Record<string, unknown>,
  fieldMap: Record<string, string>
): Record<string, unknown> {
  const mapped = mapJsonFields(item, fieldMap)
  const jobUrlTemplate = fieldMap.jobUrl

  if (jobUrlTemplate?.startsWith('__template__:')) {
    const template = jobUrlTemplate.replace('__template__:', '')
    mapped.jobUrl = applyTemplate(template, item)
  }

  return mapped
}
