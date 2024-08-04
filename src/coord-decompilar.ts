import path from 'node:path'
import * as turf from '@turf/turf'
import chalk from 'chalk'
import consola from 'consola'
import fs from 'fs-extra'
import type { CRSTypes } from 'gcoord'
import gcoord from 'gcoord'
import { pbf2geojson, transformCoordinates } from './core'
import ProgressBar from './core/progress-bar'
import { pbfFile2Geojson } from './pbf2geojson'

/**
 * JSON 数据参数，指定行政区划代码字段可以提高检索效率
 */
interface JsonOptions {
  /** 经纬度字段 */
  latlngField: string
  /** 坐标类型 */
  latlngType: CRSTypes
  /** 是否添加中心点 */
  centerPoint?: boolean
  /** 需要检索的经纬度所属行政区划代码, 可提高检索效率。如: 310100、310000、210100102 */
  includeCode?: string | RegExp
  /** 省份代码字段 */
  provinceCodeField?: string
  /** 城市代码字段 */
  cityCodeField?: string
  /** 县区划代码字段 */
  countyCodeField?: string
  /** 乡镇区划代码字段 */
  townCodeField?: string
  /** 村区划代码字段 */
  villageCodeField?: string
}
interface FillDistrictOptions {
  /** 需要查找行政区划信息的经纬度数组文件, eg: [{latlng: [116.307428, 39.90403], ...}] */
  jsonpath: string
  output: string
  jsonOptions: JsonOptions
}

declare type DistrictLevelEnum = 'country' | 'province' | 'city' | 'county' | 'township' | 'village'

/** 获取指定行政级别的上一层级 */
function getPreLevel(level: DistrictLevelEnum): DistrictLevelEnum {
  let preLevel: DistrictLevelEnum
  switch (level) {
    case 'province':
      preLevel = 'country'
      break
    case 'city':
      preLevel = 'province'
      break
    case 'county':
      preLevel = 'city'
      break
    case 'township':
      preLevel = 'county'
      break
    case 'village':
      preLevel = 'township'
      break
  }
  return preLevel
}

/**
 * 通过行政区划代码，获取所有上级区划代码
 * @example
 * getAdCodeLevel('310101001') => { province: '310000', city: '310100', county: '310101', township: '310101001' }
 * getAdCodeLevel('310000') => { province: '310000' }
 * getAdCodeLevel('310000000') => { province: '310000' }
 * @param adcode 行政区划代码
 */
function getAdCodeLevel(adcode: string): Partial<Record<DistrictLevelEnum, string>> {
  const levelAdcode: Partial<Record<DistrictLevelEnum, string>> = { country: '000000' }
  const vaildAdcode = adcode.replace(/0+$/, '')
  let vaildAdcodeLen: number
  if (adcode.length > 6) {
    vaildAdcodeLen = Math.ceil(vaildAdcode.length / 3) * 3
  }
  else {
    vaildAdcodeLen = Math.ceil(vaildAdcode.length / 2) * 2
  }
  for (let i = 2; i <= vaildAdcodeLen;) {
    const code = vaildAdcode.substring(0, i).padEnd(i > 6 ? 9 : 6, '0')
    switch (i) {
      case 2:
        levelAdcode.province = code
        break
      case 4:
        levelAdcode.city = code
        break
      case 6:
        levelAdcode.county = code
        break
      case 9:
        levelAdcode.township = code
        break
      case 12:
        levelAdcode.village = code
        break
    }
    i = i < 6 ? i + 2 : i + 3
  }
  return levelAdcode
}

/**
 * 通过行政区划级别和区划代码，获取所有匹配的 pbf 文件路径
 * @param geopbfDir 下载的 geopbf 目录
 * @param level 行政区划级别
 * @param includeAdcode 行政区划代码
 * @returns 所有指定级别的 pbf 文件路径列表
 */
async function getLevelPbfFiles(geopbfDir: string, level: DistrictLevelEnum, includeAdcode: string | RegExp): Promise<string[]> {
  const isExists = await fs.pathExists(path.resolve(geopbfDir, level))
  if (!isExists) {
    return [] as string[]
  }
  const files = await fs.readdir(path.resolve(geopbfDir, level))
  if (typeof includeAdcode === 'string') {
    const targetAdcode = getAdCodeLevel(includeAdcode)[getPreLevel(level)]
    return files.filter(file => file.startsWith(targetAdcode)).map(file => path.resolve(geopbfDir, level, file))
  }
  else {
    return files.filter(file => includeAdcode.test(file)).map(file => path.resolve(geopbfDir, level, file))
  }
}

interface CountryLevelInfo {
  countryName: string
  countryAdcode: string
  countryCenterPoint?: GeoJSON.Position
}

interface ProvinceLevelInfo {
  provinceName: string
  provinceAdcode: string
  provinceCenterPoint?: GeoJSON.Position
}

interface CityLevelInfo {
  cityName: string
  cityAdcode: string
  cityCenterPoint?: GeoJSON.Position
}

interface CountyLevelInfo {
  countyName: string
  countyAdcode: string
  countyCenterPoint?: GeoJSON.Position
}

interface TownshipLevelInfo {
  townshipName: string
  townshipAdcode: string
  townshipCenterPoint?: GeoJSON.Position
}

interface VillageLevelInfo {
  villageName: string
  villageAdcode: string
  villageCenterPoint?: GeoJSON.Position
}

interface LevelsInfo {
  countryInfo?: CountryLevelInfo
  provinceInfo?: ProvinceLevelInfo
  cityInfo?: CityLevelInfo
  countyInfo?: CountyLevelInfo
  townshipInfo?: TownshipLevelInfo
  villageInfo?: VillageLevelInfo
}

/**
 * 通过行政区划代码，获取行政区划信息
 * @param geopbfDir 下载的 geopbf 目录
 * @param adcode 行政区划代码
 * @param centerPoint 是否添加中心点
 */
async function getLevelInfoByAdcode(geopbfDir: string, adcode: string, centerPoint: boolean = false): Promise<LevelsInfo> {
  let countryInfo: CountryLevelInfo
  let provinceInfo: ProvinceLevelInfo
  let cityInfo: CityLevelInfo
  let countyInfo: CountyLevelInfo
  let townshipInfo: TownshipLevelInfo
  let villageInfo: VillageLevelInfo

  const levelInfo = getAdCodeLevel(adcode)

  if (levelInfo.country === '000000') {
    countryInfo = {
      countryAdcode: '000000',
      countryName: '中华人民共和国',
    }
  }

  if (levelInfo.province) {
    const provincePbfs = await getLevelPbfFiles(geopbfDir, 'province', adcode)
    if (provincePbfs.length === 1) {
      const provinceGeojson = await pbfFile2Geojson(provincePbfs[0]) as GeoJSON.FeatureCollection
      const feature = provinceGeojson.features.find(f => f.properties.adcode === levelInfo.province)
      provinceInfo = {
        provinceName: feature.properties.name,
        provinceAdcode: feature.properties.adcode,
      }
      if (centerPoint) {
        provinceInfo.provinceCenterPoint = turf.center(feature).geometry.coordinates as GeoJSON.Position
      }
    }
  }

  if (levelInfo.city) {
    const cityPbfs = await getLevelPbfFiles(geopbfDir, 'city', adcode)
    if (cityPbfs.length === 1) {
      const cityGeojson = await pbfFile2Geojson(cityPbfs[0]) as GeoJSON.FeatureCollection
      const feature = cityGeojson.features.find(f => f.properties.adcode === levelInfo.city)
      cityInfo = {
        cityName: feature.properties.name,
        cityAdcode: feature.properties.adcode,
      }
      if (centerPoint) {
        cityInfo.cityCenterPoint = turf.center(feature).geometry.coordinates as GeoJSON.Position
      }
    }
  }

  if (levelInfo.county) {
    const countyPbfs = await getLevelPbfFiles(geopbfDir, 'county', adcode)
    if (countyPbfs.length === 1) {
      const countyGeojson = await pbfFile2Geojson(countyPbfs[0]) as GeoJSON.FeatureCollection
      const feature = countyGeojson.features.find(f => f.properties.adcode === levelInfo.county)
      countyInfo = {
        countyName: feature.properties.name,
        countyAdcode: feature.properties.adcode,
      }
      if (centerPoint) {
        countyInfo.countyCenterPoint = turf.center(feature).geometry.coordinates as GeoJSON.Position
      }
    }
  }

  if (levelInfo.township) {
    const townshipPbfs = await getLevelPbfFiles(geopbfDir, 'township', adcode)
    if (townshipPbfs.length === 1) {
      const townshipGeojson = await pbfFile2Geojson(townshipPbfs[0]) as GeoJSON.FeatureCollection
      const feature = townshipGeojson.features.find(f => f.properties.adcode === levelInfo.township)
      townshipInfo = {
        townshipName: feature.properties.name,
        townshipAdcode: feature.properties.adcode,
      }
      if (centerPoint) {
        townshipInfo.townshipCenterPoint = turf.center(feature).geometry.coordinates as GeoJSON.Position
      }
    }
  }

  if (levelInfo.village) {
    const villagePbfs = await getLevelPbfFiles(geopbfDir, 'village', adcode)
    if (villagePbfs.length === 1) {
      const villageGeojson = await pbfFile2Geojson(villagePbfs[0]) as GeoJSON.FeatureCollection
      const feature = villageGeojson.features.find(f => f.properties.adcode === levelInfo.village)
      villageInfo = {
        villageName: feature.properties.name,
        villageAdcode: feature.properties.adcode,
      }
      if (centerPoint) {
        villageInfo.villageCenterPoint = turf.center(feature).geometry.coordinates as GeoJSON.Position
      }
    }
  }

  return { countryInfo, countyInfo, cityInfo, townshipInfo, villageInfo, provinceInfo }
}

interface LevelInfoQueryOptions {
  geopbfDir: string
  level: DistrictLevelEnum
  adcodeRegex?: RegExp
  centerPoint?: boolean
  parentAdcode: string
  point: GeoJSON.Feature<GeoJSON.Point>
}
/**
 * 通过经纬度获取指定层级行政区划信息
 * @param options 行政区划信息查询配置
 * @returns 行政区划信息
 */
async function getLevelInfo(options: LevelInfoQueryOptions) {
  const { geopbfDir, level, adcodeRegex, centerPoint, parentAdcode, point } = options
  let files = await getLevelPbfFiles(geopbfDir, level, parentAdcode)
  if (adcodeRegex) {
    const tmpFiles = files.filter(file => adcodeRegex.test(path.basename(file)))
    if (tmpFiles.length !== 0) {
      files = tmpFiles
    }
  }
  for (const file of files) {
    const geojson = await pbf2geojson(await fs.readFile(file)) as GeoJSON.FeatureCollection
    let features = geojson.features
    if (adcodeRegex) {
      const tmpFeatures = features.filter(f => adcodeRegex.test(f.properties.adcode))
      if (tmpFeatures.length !== 0) {
        features = tmpFeatures
      }
    }
    for (const feature of features) {
      if (turf.booleanPointInPolygon(point, feature as unknown as GeoJSON.MultiPolygon)) {
        const levelInfo = {
          [`${level}Name`]: feature.properties.name,
          [`${level}Adcode`]: feature.properties.adcode,
        }
        if (centerPoint) {
          levelInfo[`${level}CenterPoint`] = turf.center(feature).geometry.coordinates as GeoJSON.Position
        }
        return levelInfo
      }
    }
  }
  return null
}

/**
 * 填充坐标点所在的行政区划信息
 * @description 需要搭配 geopbf 目录使用（有点麻烦）。
 * @example
 * pbf文件可以通过splitGeojaon2PbfFiles函数生成，比如一个包含所有城市的geojson文件可以生成一个city文件夹
 * geopbf 目录结构如下：
 * - geopbf
 *   - province
 *     - 000000.pbf // 包含中国所有省行政区边界
 *   - city
 *     - 110000.pbf // 包含一个省下的所有市行政区边界
 *     - 120000.pbf
 *   - county
 *     - 310100.pbf
 *     - 310400.pbf
 *   - township
 *     - 310101.pbf
 *     - 310102.pbf
 *   - village
 *     - 310101001.pbf
 *     - 310101002.pbf
 *
 * @param geopbfDir 下载的 geopbf 目录
 * @param options 填充行政区划的配置
 */
export async function coordDecompilar(geopbfDir: string, options: FillDistrictOptions): Promise<void> {
  const geopbfExists = await fs.pathExists(geopbfDir)
  if (!geopbfExists) {
    consola.error(chalk.red(`未找到 geopbf 目录`))
    return
  }

  consola.success(`加载${chalk.green('geopbf')}目录完成`)
  const { jsonpath, output, jsonOptions } = options
  const jsonData = await fs.readJSON(jsonpath) as Array<any>

  const { includeCode = '000000', centerPoint = false } = jsonOptions

  let includeLevelInfo: LevelsInfo
  if (typeof includeCode === 'string') {
    includeLevelInfo = await getLevelInfoByAdcode(geopbfDir, includeCode, centerPoint)
  }
  consola.success(`加载${chalk.green('includeCode')}行政区划信息完成`)

  const progressBar = new ProgressBar({
    duration: jsonData.length,
  })
  const ps = jsonData.map(async (item) => {
    const { countyCodeField, townCodeField, villageCodeField, latlngField, latlngType } = jsonOptions
    const latlng = item[latlngField]
    if (!latlng) {
      progressBar.run()
      return Promise.resolve(null)
    }
    let point: GeoJSON.Feature<GeoJSON.Point>
    if (typeof latlng === 'string') {
      point = turf.point(latlng.split(',').map(Number))
    }
    else {
      point = turf.point(latlng)
    }
    point = turf.point(transformCoordinates(point.geometry.coordinates as [number, number], latlngType, gcoord.WGS84 as any))

    const itemAdcode = item[villageCodeField || townCodeField || countyCodeField]
    let itemLevelInfo: LevelsInfo = JSON.parse(JSON.stringify(includeLevelInfo)) || {}
    if (itemAdcode) {
      itemLevelInfo = await getLevelInfoByAdcode(geopbfDir, itemAdcode)
    }
    let includeRegex: RegExp
    if (includeCode instanceof RegExp) {
      includeRegex = includeCode
    }

    if (!itemLevelInfo.countryInfo) {
      const countryLevelInfo: CountryLevelInfo = {
        countryName: '中华人民共和国',
        countryAdcode: '000000',
      }
      itemLevelInfo.countryInfo = countryLevelInfo
    }

    if (!itemLevelInfo.provinceInfo && itemLevelInfo.countryInfo) {
      const provinceLevelInfo = await getLevelInfo({
        geopbfDir,
        centerPoint,
        level: 'province',
        adcodeRegex: includeRegex,
        parentAdcode: '000000',
        point,
      })
      itemLevelInfo.provinceInfo = provinceLevelInfo as ProvinceLevelInfo
    }

    if (!itemLevelInfo.cityInfo && itemLevelInfo.provinceInfo) {
      const cityLevelInfo = await getLevelInfo({
        geopbfDir,
        centerPoint,
        level: 'city',
        adcodeRegex: includeRegex,
        parentAdcode: itemLevelInfo.provinceInfo.provinceAdcode,
        point,
      })
      itemLevelInfo.cityInfo = cityLevelInfo as CityLevelInfo
    }

    if (!itemLevelInfo.countyInfo && itemLevelInfo.cityInfo) {
      const countyLevelInfo = await getLevelInfo({
        geopbfDir,
        centerPoint,
        level: 'county',
        adcodeRegex: includeRegex,
        parentAdcode: itemLevelInfo.cityInfo.cityAdcode,
        point,
      })
      itemLevelInfo.countyInfo = countyLevelInfo as CountyLevelInfo
    }

    if (!itemLevelInfo.townshipInfo && itemLevelInfo.countyInfo) {
      const townshipLevelInfo = await getLevelInfo({
        geopbfDir,
        centerPoint,
        level: 'township',
        adcodeRegex: includeRegex,
        parentAdcode: itemLevelInfo.countyInfo.countyAdcode,
        point,
      })
      itemLevelInfo.townshipInfo = townshipLevelInfo as TownshipLevelInfo
    }

    if (!itemLevelInfo.villageInfo && itemLevelInfo.townshipInfo) {
      const villageLevelInfo = await getLevelInfo({
        geopbfDir,
        centerPoint,
        level: 'village',
        adcodeRegex: includeRegex,
        parentAdcode: itemLevelInfo.townshipInfo.townshipAdcode,
        point,
      })
      itemLevelInfo.villageInfo = villageLevelInfo as VillageLevelInfo
    }

    for (const key in itemLevelInfo) {
      Object.assign(item, itemLevelInfo[key])
    }
    item.geometry = point.geometry
    progressBar.run()
  })
  await Promise.all(ps)
  await fs.writeJSON(output, jsonData)
  consola.success(`填充JSON文件完成, 输出路径: ${chalk.green(output)}`)
}
