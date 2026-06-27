export function isE2eMode(): boolean {
  return process.env.ZHISUDA_E2E === '1'
}
