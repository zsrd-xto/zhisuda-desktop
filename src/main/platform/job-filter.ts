/** @deprecated 使用 matching.service 中的 rankJobs / passesHardGate */
import type { FetchCriteriaSnapshot } from '../../shared/types/preferences'

export { parseSalaryRangeK } from '../services/matching.service'

/** @deprecated 使用 rankJobs */
export function filterJobsByCriteria<T extends {
  title: string
  city: string
  salary: string
  companyName: string
  isOutsource?: boolean
}>(jobs: T[], _criteria: FetchCriteriaSnapshot): T[] {
  return jobs
}
