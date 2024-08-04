import togeojson from '@mapbox/togeojson'
import chalk from 'chalk'
import { Presets, SingleBar } from 'cli-progress'
import consola from 'consola'
import type { CRSTypes } from 'gcoord'
import gcoord from 'gcoord'
import geobuf from 'geobuf'
import type { GeoJSON, Position } from 'geojson'
import Pbf from 'pbf'
import * as shapefile from 'shapefile'
import { DOMParser } from 'xmldom'
import fs from 'fs-extra'

const CRSTypesEnum = gcoord.CRSTypes
export { CRSTypesEnum, GeoJSON, Position }

/**
 * 转换坐标或GeoJSON的坐标系
 * @param input 需要转换的坐标或GeoJSON
 * @param crsFrom 原始坐标系
 * @param crsTo 目标坐标系
 */
export function transformCoordinates<T extends GeoJSON | Position>(input: T | string, crsFrom: CRSTypes, crsTo: CRSTypes): T {
  return gcoord.transform(input as any, crsFrom, crsTo)
}

/**
 * 转换GeoJSON为PBF格式
 * @param geojson geojson数据
 */
export function geojson2pbf(geojson: GeoJSON): Uint8Array {
  return geobuf.encode(geojson, new Pbf() as any)
}

/**
 * 转换PBF格式为GeoJSON
 * @param pbf pbf数据
 */
export function pbf2geojson(pbf: Buffer | Pbf): GeoJSON {
  if (pbf instanceof Pbf) {
    return geobuf.decode(pbf as any)
  }
  else {
    return geobuf.decode(new Pbf(pbf) as any)
  }
}

/**
 * kml 文件转 geojson
 * @description kml 文件转 geojson, 奥维地图导出的KML文件(MapBox 同格式)
 * @param kml - kml 文件内容 或 文件路径
 */
export async function kml2Geojson(kml: Buffer | string): Promise<GeoJSON> {
  if (typeof kml === 'string') {
    kml = await fs.readFile(kml)
  }
  const kmlDom = new DOMParser().parseFromString(kml.toString())
  const kmlParser = togeojson.kml
  return kmlParser(kmlDom)
}

/**
 * shp 文件转 geojson
 * @param shpFilePath - shp 文件路径
 * @param dbfFilePath - dbf 文件路径, 如果dbf为空则尝试读取shp文件同名的dbf文件
 * @param options - shapefile 读取选项, 默认为 {encoding: 'utf8'}
 */
export async function shp2GeoJSON(shpFilePath: string, dbfFilePath?: string, options?: shapefile.Options): Promise<GeoJSON> {
  options = options || {
    encoding: 'utf8',
  }
  consola.start(chalk.blue('\n读取shape 文件中...\n'))
  try {
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    }
    const source = await shapefile.open(shpFilePath, dbfFilePath, options)
    const singleBar = new SingleBar({ format: `feature: ${chalk.green('{bar}')} | {value}` }, Presets.shades_classic)
    singleBar.start(1, 0)
    for (let result = await source.read(); result.done !== true; result = await source.read()) {
      singleBar.increment()
      geojson.features.push(result.value)
    }
    singleBar.stop()
    consola.success(chalk.green('\n读取shape文件完成！\n'))
    return geojson
  }
  catch (error) {
    return Promise.reject(error)
  }
}
