import path from 'node:path'
import type Pbf from 'pbf'
import consola from 'consola'
import fs from 'fs-extra'
import { pbf2geojson } from './core'
import ProgressBar from './core/progress-bar'

/**
 * Protobuf 文件转换为 GeoJSON 对象
 *
 * @param pbf Pbf 文件路径
 */
export async function pbfFile2Geojson(pbf: string): Promise<GeoJSON.GeoJSON> {
  const pbfData = await fs.readFile(pbf) as Buffer
  return pbf2geojson(pbfData)
}

/**
 * 将 Protobuf 对象或者 Protobuf 文件转换为 GeoJSON 文件
 *
 * @param pbf Pbf 对象 或者 pbf文件路径
 * @param output 输出文件路径
 */
export async function pbf2geojsonFile(pbf: Pbf | Buffer | string, output: string): Promise<void> {
  if (typeof pbf === 'string') {
    pbf = await fs.readFile(pbf) as Buffer
  }
  const geojson = pbf2geojson(pbf)

  await fs.writeFile(output, JSON.stringify(geojson))
}

/**
 * 将文件夹内的 pbf 文件转换为 geojson 文件
 * @param dir pbf 文件夹路径
 * @param outputDir geojson 文件输出文件夹路径, 默认与 pbf 文件夹相同
 */
export async function pbf2geojsonFiles(dir: string, outputDir?: string): Promise<void> {
  const files = await fs.readdir(dir)
  const progressBar = new ProgressBar({
    current: 0,
    duration: files.length,
  })
  for (const file of files) {
    if (!file.endsWith('.pbf'))
      continue
    const newFile = file.replace('.pbf', '.geojson')
    const output = outputDir ? path.join(outputDir, newFile) : path.join(dir, newFile)
    await pbf2geojsonFile(path.join(dir, file), output)
    progressBar.run()
  }
}

/**
 * 将多个 pbf 文件合并为一个 geojson 文件
 * @param input pbf 文件夹路径
 * @param output geojson 文件输出路径, 默认与 pbf 文件夹相同
 */
export async function mergePbfFiles2Geojson(input: string, output: string): Promise<void> {
  consola.start('Merging pbf files to geojson')
  const files = await fs.readdir(input)
  const progressBar = new ProgressBar({
    current: 0,
    duration: files.length,
  })
  const geojson = {
    type: 'FeatureCollection',
    features: [],
  }
  for (const file of files) {
    if (!file.endsWith('.pbf'))
      continue
    const pbf = await fs.readFile(path.join(input, file)) as Buffer
    const featureCollection = pbf2geojson(pbf) as GeoJSON.FeatureCollection
    geojson.features.push(...featureCollection.features)
    progressBar.run()
  }
  progressBar.stop()
  await fs.writeFile(output, JSON.stringify(geojson))
  consola.success('Geojson file generated successfully')
}
