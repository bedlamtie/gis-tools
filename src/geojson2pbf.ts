import path from 'node:path'
import type { Buffer } from 'node:buffer'
import type { GeoJSON } from 'geojson'
import consola from 'consola'
import fs from 'fs-extra'
import { geojson2pbf } from './core'
import ProgressBar from './core/progress-bar'

/**
 * 将 GeoJSON 对象或者 geojson 文件转换为 Protobuf 文件
 *
 * @param geojson GeoJSON 对象 或者 geojson文件路径
 * @param output 输出文件路径
 */
export async function geojson2pbfFile(geojson: GeoJSON | string, output: string): Promise<void> {
  if (typeof geojson === 'string') {
    geojson = await fs.readJSON(geojson) as GeoJSON
  }
  const pbf = geojson2pbf(geojson)

  await fs.writeFile(output, pbf as Buffer)
}

/**
 * 将文件夹内的 geojson 文件转换为 Protobuf 文件
 *
 * @param dir geojson 文件夹路径
 * @param outputDir pbf 文件输出文件夹路径, 默认与 geojson 文件夹相同
 */
export async function geojson2pbfFiles(dir: string, outputDir?: string): Promise<void> {
  const files = await fs.readdir(dir)
  const progressBar = new ProgressBar({
    current: 0,
    duration: files.length,
  })
  for (const file of files) {
    if (!file.endsWith('.geojson'))
      continue
    const newFile = file.replace('.geojson', '.pbf')
    const output = outputDir ? path.join(outputDir, newFile) : path.join(dir, newFile)
    await geojson2pbfFile(path.join(dir, file), output)
    progressBar.run()
  }
}

interface GeoJsonSplitOptions {
  /** Pbf 输出文件夹路径 */
  outputDir: string
  /** 按指定值分组 */
  goupBy: (feature: GeoJSON.Feature) => string
  /** 输出文件名前缀，默认文件名为分组值。也可以传入一个函数，接收分组值作为参数，返回新的文件名 */
  pbfPrefix?: string | ((val: string | number) => string)
}

/**
 * 将 GeoJSON 文件按照指定条件分组，并将每个分组的 GeoJSON 转换为 Protobuf 文件
 * @param input 输入文件路径或者 GeoJSON 对象
 * @param options 配置选项
 * @example
 * ```
 * const options = {
 *   outputDir: path.join(__dirname, 'output'),
 *   goupBy: feature => feature.properties.adcode.substring(0, 6),
 *   pbfPrefix: 'type_'
 * }
 * splitGeojaon2PbfFiles(path.join(__dirname, 'input.geojson'), options);
 * ```
 */
export async function splitGeojaon2PbfFiles(input: string | GeoJSON, options: GeoJsonSplitOptions): Promise<void> {
  if (typeof input === 'string') {
    input = await fs.readJSON(input) as GeoJSON
  }

  const { outputDir, goupBy, pbfPrefix } = options
  await fs.ensureDir(outputDir)

  const groups = new Map<string | number, GeoJSON.Feature[]>()
  if (input.type === 'FeatureCollection') {
    for (const feature of input.features) {
      const key = goupBy(feature)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(feature)
    }
    consola.start(`Split ${input.features.length} features into ${groups.size} groups`)
    const progressBar = new ProgressBar({
      current: 0,
      duration: groups.size,
    })
    for await (const [key, features] of groups) {
      const pbf = geojson2pbf({ type: 'FeatureCollection', features })
      const prefix = typeof pbfPrefix === 'function' ? pbfPrefix(key) : pbfPrefix ? pbfPrefix + String(key) : String(key)
      const output = path.join(outputDir, `${prefix}.pbf`)
      await fs.writeFile(output, pbf as Buffer)
      progressBar.run()
    }
    progressBar.stop()
    consola.success('All done!')
  }
  else {
    consola.error('输入文件必须为 FeatureCollection')
  }
}
