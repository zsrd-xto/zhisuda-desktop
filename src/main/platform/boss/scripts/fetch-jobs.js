(function () {
  function parseCard(card, index) {
    const titleEl = card.querySelector(
      '.job-name, .job-title, .name, .job-card-left .job-name, a.job-name, [class*="job-name"]'
    )
    const companyEl = card.querySelector(
      '.company-name, .boss-name, .company-text, .company-info .company-name, [class*="company-name"]'
    )
    const salaryEl = card.querySelector('.salary, .job-salary, .job-info .salary, [class*="salary"]')
    const cityEl = card.querySelector('.job-area, .city, .job-info, .job-area-wrapper, [class*="job-area"]')
    const linkEl =
      card.querySelector('a[href*="job_detail"], a[href*="/job/"], a[href]') ||
      (card.matches?.('a[href*="job_detail"], a[href*="/job/"]') ? card : null) ||
      card.closest('a[href]')

    const title = titleEl?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    const url = linkEl instanceof HTMLAnchorElement ? linkEl.href : ''
    const idMatch = url.match(/job_detail\/([^.?/]+)/) || url.match(/\/job\/([^.?/]+)/)
    const id = idMatch?.[1] || url || String(index)
    const company = companyEl?.textContent?.trim() || ''
    const description = card.textContent?.trim() || ''
    const lowerText = (company + ' ' + description).toLowerCase()
    const isOutsource = /外包|外派|od\b/i.test(lowerText)

    return {
      id,
      title,
      company,
      salary: salaryEl?.textContent?.trim() || '',
      city: cityEl?.textContent?.trim() || '',
      url,
      description,
      isOutsource
    }
  }

  const selectors = [
    '.job-card-wrapper',
    '.job-list-box .job-card',
    '.job-card',
    '.rec-job-list .job-card',
    'li.job-card-box',
    '.job-list li',
    '[ka="search_list_1"]',
    'div[class*="job-card"]'
  ]

  const jobs = []
  const seen = new Set()

  for (const selector of selectors) {
    const cards = document.querySelectorAll(selector)
    if (cards.length === 0) {
      continue
    }

    cards.forEach((card, index) => {
      if (jobs.length >= 100) {
        return
      }
      const job = parseCard(card, index)
      if (!job || seen.has(job.id)) {
        return
      }
      seen.add(job.id)
      jobs.push(job)
    })

    if (jobs.length > 0) {
      break
    }
  }

  if (jobs.length === 0) {
    const links = document.querySelectorAll('a[href*="job_detail"], a[href*="/job/"]')
    links.forEach((link, index) => {
      if (jobs.length >= 100) {
        return
      }
      const card =
        link.closest('li, div[class*="job"], div[class*="card"], .job-list-box > *') ||
        link.parentElement
      if (!card) {
        return
      }
      const job = parseCard(card, index)
      if (!job || seen.has(job.id)) {
        return
      }
      seen.add(job.id)
      jobs.push(job)
    })
  }

  return jobs
})()
