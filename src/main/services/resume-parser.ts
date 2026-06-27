import { randomUUID } from 'crypto'
import mammoth from 'mammoth'
import type {
  Certificate,
  Education,
  ProjectExperience,
  ResumeParsedData,
  WorkExperience
} from '../../shared/types/resume'
import { createEmptyResumeParsedData } from '../../shared/types/resume'

const SECTION_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'work', pattern: /^(工作经历|工作经验|工作背景|任职经历)/ },
  { key: 'project', pattern: /^(项目经历|项目经验|项目介绍|项目背景)/ },
  { key: 'education', pattern: /^(教育经历|教育背景|学历)/ },
  { key: 'certificate', pattern: /^(证书和荣誉|证书荣誉|资格证书|荣誉奖项)/ },
  { key: 'summary', pattern: /^(个人优势|自我评价|个人简介|专业技能|技能特长)/ }
]

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE_PATTERN = /(?:\+?86[-\s]?)?1[3-9]\d{9}/
const DATE_RANGE_PATTERN =
  /(\d{4}[./年-]\d{1,2}(?:[./月-]\d{1,2}日?)?|\d{4}[./年]\d{1,2}|\d{4})\s*[-–—~至到]+\s*(\d{4}[./年-]\d{1,2}(?:[./月-]\d{1,2}日?)?|\d{4}[./年]\d{1,2}|\d{4}|至今|现在|present)/i

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  await ensurePdfRuntimePolyfills()
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

async function ensurePdfRuntimePolyfills(): Promise<void> {
  if (typeof globalThis.DOMMatrix !== 'undefined') {
    return
  }

  const { default: DOMMatrix } = await import('dommatrix')
  globalThis.DOMMatrix = DOMMatrix as typeof globalThis.DOMMatrix
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export function parseResumeText(text: string): ResumeParsedData {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()
  const data = createEmptyResumeParsedData()

  if (!normalized) {
    return data
  }

  const emailMatch = normalized.match(EMAIL_PATTERN)
  if (emailMatch) {
    data.basicInfo.email = emailMatch[0]
  }

  const phoneMatch = normalized.match(PHONE_PATTERN)
  if (phoneMatch) {
    data.basicInfo.phone = phoneMatch[0].replace(/\s+/g, '')
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length > 0) {
    const firstLine = lines[0]
    if (
      !EMAIL_PATTERN.test(firstLine) &&
      !PHONE_PATTERN.test(firstLine) &&
      firstLine.length <= 20
    ) {
      data.basicInfo.name = firstLine
    }
  }

  const sections = splitSections(lines)
  data.basicInfo.summary = sections.summary.join('\n').trim()
  data.basicInfo.skills = extractSkills(sections.summary.join('\n'))
  data.workExperiences = parseWorkExperiences(sections.work)
  data.projects = parseProjects(sections.project)
  data.educations = parseEducations(sections.education)
  data.certificates = parseCertificates(sections.certificate)

  const headerLines = sections.header
  for (const line of headerLines) {
    if (line.includes('意向') || line.includes('求职')) {
      data.basicInfo.jobIntention = line.replace(/^求职意向[:：]?\s*/, '')
    }
  }

  if (!data.basicInfo.jobIntention) {
    const intentionLine = headerLines.find((line) => /工程师|开发|产品|设计|经理|专员/.test(line))
    if (intentionLine) {
      data.basicInfo.jobIntention = intentionLine
    }
  }

  return data
}

interface SectionBuckets {
  header: string[]
  work: string[]
  project: string[]
  education: string[]
  certificate: string[]
  summary: string[]
}

function splitSections(lines: string[]): SectionBuckets {
  const buckets: SectionBuckets = {
    header: [],
    work: [],
    project: [],
    education: [],
    certificate: [],
    summary: []
  }

  let current: keyof SectionBuckets = 'header'

  for (const line of lines) {
    const matched = SECTION_PATTERNS.find((item) => item.pattern.test(line))
    if (matched) {
      current = matched.key as keyof SectionBuckets
      continue
    }

    buckets[current].push(line)
  }

  return buckets
}

function parseWorkExperiences(lines: string[]): WorkExperience[] {
  return parseBlocks(lines).map((block) => {
    const [titleLine = '', ...rest] = block
    const dateMatch = titleLine.match(DATE_RANGE_PATTERN)
    const titleWithoutDate = dateMatch ? titleLine.replace(dateMatch[0], '').trim() : titleLine
    const parts = splitByDelimiters(titleWithoutDate)

    return {
      id: randomUUID(),
      company: parts[0] ?? '',
      position: parts[1] ?? '',
      startDate: dateMatch?.[1] ?? '',
      endDate: dateMatch?.[2] ?? '',
      description: rest.join('\n').trim()
    }
  })
}

function parseProjects(lines: string[]): ProjectExperience[] {
  return parseBlocks(lines).map((block) => {
    const [titleLine = '', ...rest] = block
    const parts = splitByDelimiters(titleLine)

    return {
      id: randomUUID(),
      name: parts[0] ?? titleLine,
      role: parts[1] ?? '',
      description: rest.join('\n').trim()
    }
  })
}

function parseEducations(lines: string[]): Education[] {
  return parseBlocks(lines).map((block) => {
    const line = block.join(' ')
    const dateMatch = line.match(DATE_RANGE_PATTERN)
    const withoutDate = dateMatch ? line.replace(dateMatch[0], '').trim() : line
    const parts = splitByDelimiters(withoutDate)

    return {
      id: randomUUID(),
      school: parts[0] ?? '',
      major: parts[1] ?? '',
      degree: parts[2] ?? '',
      startDate: dateMatch?.[1] ?? '',
      endDate: dateMatch?.[2] ?? ''
    }
  })
}

function parseCertificates(lines: string[]): Certificate[] {
  return lines.map((line) => ({
    id: randomUUID(),
    name: line,
    date: line.match(/\d{4}[./年-]\d{1,2}/)?.[0] ?? ''
  }))
}

function parseBlocks(lines: string[]): string[][] {
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    const looksLikeTitle =
      DATE_RANGE_PATTERN.test(line) || /^[\u4e00-\u9fa5A-Za-z0-9&().\-·]{2,40}[|｜/\\-]/.test(line)

    if (looksLikeTitle && current.length > 0) {
      blocks.push(current)
      current = [line]
      continue
    }

    current.push(line)
  }

  if (current.length > 0) {
    blocks.push(current)
  }

  return blocks
}

function splitByDelimiters(value: string): string[] {
  return value
    .split(/[|｜/\\-]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function extractSkills(summary: string): string[] {
  const skillLine = summary.split('\n').find((line) => /技能|熟悉|精通|掌握/.test(line))

  if (!skillLine) {
    return []
  }

  return skillLine
    .replace(/^[^:：]*[:：]/, '')
    .split(/[,，、/|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function parseResumeFile(buffer: Buffer, fileName: string): Promise<ResumeParsedData> {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith('.pdf')) {
    const text = await extractTextFromPdf(buffer)
    return parseResumeText(text)
  }

  if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
    const text = await extractTextFromDocx(buffer)
    return parseResumeText(text)
  }

  throw new Error('仅支持 PDF 和 Word 格式')
}
