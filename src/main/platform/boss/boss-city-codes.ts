import { PlatformError } from '../platform-error'

/** Boss 城市 code（常见城市，未命中时需扩展映射表） */
const CITY_CODE_MAP: Record<string, string> = {
  北京: '101010100',
  上海: '101020100',
  广州: '101280100',
  深圳: '101280600',
  杭州: '101210100',
  成都: '101270100',
  南京: '101190100',
  武汉: '101200100',
  西安: '101110100',
  苏州: '101190400',
  天津: '101030100',
  重庆: '101040100',
  长沙: '101250100',
  郑州: '101180100',
  东莞: '101281600',
  佛山: '101280800',
  合肥: '101220100',
  厦门: '101230200',
  青岛: '101120200',
  大连: '101070200'
}

export function resolveBossCityCode(cityName: string): string {
  const normalized = cityName.trim().replace(/市$/, '')
  const code = CITY_CODE_MAP[normalized]
  if (!code) {
    throw new PlatformError(
      `暂不支持城市「${cityName}」，请在 boss-city-codes.ts 补充映射`,
      'UNKNOWN'
    )
  }
  return code
}

export function listSupportedCities(): string[] {
  return Object.keys(CITY_CODE_MAP)
}
