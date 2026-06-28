import type { PageRecipeDom } from './types'

function escapeJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function compileFieldRead(rule: PageRecipeDom['fieldMap'][string]): string {
  const selector = escapeJsString(rule.selector)
  const attr = rule.attr ?? 'text'

  if (attr === 'href') {
    return `(function () {
      const el = card.querySelector('${selector}') || card.closest('${selector}')
      if (!el) return ''
      if (el instanceof HTMLAnchorElement) return el.href
      const link = el.querySelector('a[href]')
      return link instanceof HTMLAnchorElement ? link.href : ''
    })()`
  }

  if (attr === 'innerHTML') {
    return `(function () {
      const el = card.querySelector('${selector}')
      return el ? el.innerHTML : ''
    })()`
  }

  return `(function () {
    const el = card.querySelector('${selector}')
    return el ? (el.textContent || '').trim() : ''
  })()`
}

export function compileDomListScript(dom: PageRecipeDom, limit: number): string {
  const itemSelectors = dom.itemSelector
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `'${escapeJsString(s)}'`)
    .join(', ')

  const fieldExtractors = Object.entries(dom.fieldMap)
    .map(([key, rule]) => `'${escapeJsString(key)}': ${compileFieldRead(rule)}`)
    .join(',\n        ')

  const scrollContainer = dom.scrollContainer ? escapeJsString(dom.scrollContainer) : ''
  const scrollStep = dom.scrollStep ?? 600
  const maxRounds = dom.maxScrollRounds ?? 6

  return `(async function () {
  const itemSelectors = [${itemSelectors}]
  const limit = ${limit}
  const maxRounds = ${maxRounds}
  const scrollStep = ${scrollStep}
  const scrollContainerSel = '${scrollContainer}'

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }

  function parseCard(card) {
    const fields = {
        ${fieldExtractors}
    }
    if (!fields.title && !fields.id) return null
    return fields
  }

  function collectOnce() {
    const jobs = []
    const seen = new Set()
    for (const selector of itemSelectors) {
      const cards = document.querySelectorAll(selector)
      if (!cards.length) continue
      cards.forEach((card, index) => {
        if (jobs.length >= limit) return
        const job = parseCard(card)
        if (!job) return
        const id = job.id || job.jobUrl || String(index)
        if (seen.has(id)) return
        seen.add(id)
        jobs.push(job)
      })
      if (jobs.length) break
    }
    return jobs
  }

  const scrollEl = scrollContainerSel
    ? document.querySelector(scrollContainerSel)
    : document.scrollingElement

  let all = collectOnce()
  let lastCount = 0
  for (let round = 0; round < maxRounds && all.length < limit; round++) {
    if (scrollEl) {
      scrollEl.scrollTop = (scrollEl.scrollTop || 0) + scrollStep
    } else {
      window.scrollBy(0, scrollStep)
    }
    await sleep(2000)
    const merged = collectOnce()
    const map = new Map(all.map((j) => [j.id || j.jobUrl, j]))
    merged.forEach((j) => map.set(j.id || j.jobUrl, j))
    all = Array.from(map.values())
    if (all.length === lastCount) break
    lastCount = all.length
  }

  return all.slice(0, limit)
})()`
}
