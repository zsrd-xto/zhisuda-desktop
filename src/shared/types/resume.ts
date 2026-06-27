export interface ResumeBasicInfo {
  name: string
  phone: string
  email: string
  jobIntention: string
  summary: string
  skills: string[]
}

export interface WorkExperience {
  id: string
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
}

export interface ProjectExperience {
  id: string
  name: string
  role: string
  description: string
}

export interface Education {
  id: string
  school: string
  major: string
  degree: string
  startDate: string
  endDate: string
}

export interface Certificate {
  id: string
  name: string
  date: string
}

export interface ResumeParsedData {
  basicInfo: ResumeBasicInfo
  workExperiences: WorkExperience[]
  projects: ProjectExperience[]
  educations: Education[]
  certificates: Certificate[]
}

export interface Resume {
  id: string
  userId: string
  name: string
  filePath: string | null
  parsedData: ResumeParsedData
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export function createEmptyResumeParsedData(): ResumeParsedData {
  return {
    basicInfo: {
      name: '',
      phone: '',
      email: '',
      jobIntention: '',
      summary: '',
      skills: []
    },
    workExperiences: [],
    projects: [],
    educations: [],
    certificates: []
  }
}
