import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import type Database from 'better-sqlite3'
import type { Resume, ResumeParsedData } from '../../shared/types/resume'
import { createEmptyResumeParsedData } from '../../shared/types/resume'
import { getDb } from '../db/database'
import { getOrCreateProfile } from './user.service'
import { parseResumeFile } from './resume-parser'

interface ResumeRow {
  id: string
  user_id: string
  name: string
  file_path: string | null
  parsed_data: string
  is_primary: number
  created_at: string
  updated_at: string
}

function getResumeStorageDir(): string {
  const dir = join(app.getPath('userData'), 'resumes')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function mapRowToResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    filePath: row.file_path,
    parsedData: JSON.parse(row.parsed_data) as ResumeParsedData,
    isPrimary: row.is_primary === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getPrimaryResumeRow(userId: string, db: Database.Database): ResumeRow | undefined {
  return db
    .prepare(
      `SELECT id, user_id, name, file_path, parsed_data, is_primary, created_at, updated_at
       FROM resumes
       WHERE user_id = ? AND is_primary = 1
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get(userId) as ResumeRow | undefined
}

export function getPrimaryResume(db: Database.Database = getDb()): Resume | null {
  const user = getOrCreateProfile(db)
  const row = getPrimaryResumeRow(user.id, db)
  return row ? mapRowToResume(row) : null
}

export async function uploadResumeFromPath(
  sourcePath: string,
  db: Database.Database = getDb()
): Promise<Resume> {
  const user = getOrCreateProfile(db)
  const fileName = sourcePath.split(/[/\\]/).pop() ?? 'resume'
  const lowerName = fileName.toLowerCase()

  if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
    throw new Error('仅支持 PDF 和 Word 格式')
  }

  const buffer = readFileSync(sourcePath)
  const parsedData = await parseResumeFile(buffer, fileName)
  const resumeId = randomUUID()
  const extension = lowerName.slice(lowerName.lastIndexOf('.'))
  const storedPath = join(getResumeStorageDir(), `${resumeId}${extension}`)

  copyFileSync(sourcePath, storedPath)

  const existing = getPrimaryResumeRow(user.id, db)
  if (existing?.file_path && existsSync(existing.file_path)) {
    unlinkSync(existing.file_path)
  }

  const displayName = parsedData.basicInfo.name || fileName.replace(/\.[^.]+$/, '')

  if (existing) {
    db.prepare(
      `UPDATE resumes
       SET name = ?, file_path = ?, parsed_data = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(displayName, storedPath, JSON.stringify(parsedData), existing.id)

    const updated = db
      .prepare(
        `SELECT id, user_id, name, file_path, parsed_data, is_primary, created_at, updated_at
         FROM resumes WHERE id = ?`
      )
      .get(existing.id) as ResumeRow

    return mapRowToResume(updated)
  }

  db.prepare(
    `INSERT INTO resumes (id, user_id, name, file_path, parsed_data, is_primary)
     VALUES (?, ?, ?, ?, ?, 1)`
  ).run(resumeId, user.id, displayName, storedPath, JSON.stringify(parsedData))

  const created = db
    .prepare(
      `SELECT id, user_id, name, file_path, parsed_data, is_primary, created_at, updated_at
       FROM resumes WHERE id = ?`
    )
    .get(resumeId) as ResumeRow

  return mapRowToResume(created)
}

export function updatePrimaryResume(
  parsedData: ResumeParsedData,
  db: Database.Database = getDb()
): Resume {
  const user = getOrCreateProfile(db)
  const existing = getPrimaryResumeRow(user.id, db)

  if (!existing) {
    const resumeId = randomUUID()
    const name = parsedData.basicInfo.name || '我的简历'

    db.prepare(
      `INSERT INTO resumes (id, user_id, name, file_path, parsed_data, is_primary)
       VALUES (?, ?, ?, NULL, ?, 1)`
    ).run(resumeId, user.id, name, JSON.stringify(parsedData))

    const created = db
      .prepare(
        `SELECT id, user_id, name, file_path, parsed_data, is_primary, created_at, updated_at
         FROM resumes WHERE id = ?`
      )
      .get(resumeId) as ResumeRow

    return mapRowToResume(created)
  }

  const name = parsedData.basicInfo.name || existing.name

  db.prepare(
    `UPDATE resumes
     SET name = ?, parsed_data = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(name, JSON.stringify(parsedData), existing.id)

  const updated = db
    .prepare(
      `SELECT id, user_id, name, file_path, parsed_data, is_primary, created_at, updated_at
       FROM resumes WHERE id = ?`
    )
    .get(existing.id) as ResumeRow

  return mapRowToResume(updated)
}

export function deleteAllResumeFiles(): void {
  const dir = join(app.getPath('userData'), 'resumes')
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function ensureResumeParsedData(data: ResumeParsedData): ResumeParsedData {
  const fallback = createEmptyResumeParsedData()
  return {
    basicInfo: { ...fallback.basicInfo, ...data.basicInfo },
    workExperiences: data.workExperiences ?? [],
    projects: data.projects ?? [],
    educations: data.educations ?? [],
    certificates: data.certificates ?? []
  }
}
