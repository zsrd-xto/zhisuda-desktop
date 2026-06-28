export type PageType =
  | 'job_list'
  | 'job_detail'
  | 'login'
  | 'chat'
  | 'resume_upload'
  | 'resume_manage'

export interface DomFieldRule {
  selector: string
  attr?: 'text' | 'href' | 'innerHTML'
  regex?: string
  fallback?: DomFieldRule[]
}

export interface ActionRule {
  selector: string
  description?: string
}

export interface PageRecipeApi {
  listUrl?: string
  detailUrl?: string
  method?: 'GET' | 'POST'
  listJsonPath?: string
  detailJsonPath?: string
  hasMorePath?: string
  fieldMap: Record<string, string>
  pagination?: {
    param: string
    startPage?: number
    maxPages: number
  }
  queryParams?: Record<string, string>
}

export interface PageRecipeDom {
  listContainer?: string
  itemSelector: string
  scrollContainer?: string
  scrollStep?: number
  maxScrollRounds?: number
  fieldMap: Record<string, DomFieldRule>
}

export interface PageRecipe {
  pageType: PageType
  version: string
  urlPattern: string
  api?: PageRecipeApi
  dom?: PageRecipeDom
  actions?: Record<string, ActionRule>
}

export interface PlatformPageProfileRow {
  id: string
  platform: string
  page_type: string
  version: string
  url_pattern: string
  dom_fingerprint: string | null
  api_fingerprint: string | null
  recipe_json: string
  is_active: number
  captured_at: string | null
  notes: string | null
}

export interface SeedProfileFile {
  version: string
  platform: string
  profiles: Array<{
    pageType: PageType
    version: string
    urlPattern: string
    domFingerprint?: string
    apiFingerprint?: string
    notes?: string
    recipe: PageRecipe
  }>
}
