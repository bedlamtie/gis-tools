import type { Buffer } from 'node:buffer'
import imageSize from 'image-size'
import proj4 from 'proj4'
import { DOMParser } from 'xmldom'
import fs from 'fs-extra'

interface PgwContent {
  xscale: number
  yskew: number
  xskew: number
  yscale: number
  xpos: number
  ypos: number
}

/**
 * 通过QGIS生成的PNG图像、PGW文件、WKT文件，计算其bounds
 * @param imgPath img文件路径
 * @param pgwPath pgw文件路径
 * @param xmlPath xml文件路径
 *
 * @returns bounds经纬度数组
 */
export async function imgPgwBounds(imgPath: string, pgwPath: string, xmlPath: string): Promise<Array<number>> {
  const dimensions = imageSize(imgPath)
  const pgwContent = await fs.readFile(pgwPath) as Buffer
  const pgwParams = pgwContent.toString().split('\n')
  const pgwParamsObj: PgwContent = {
    xscale: Number.parseFloat(pgwParams[0]),
    yskew: Number.parseFloat(pgwParams[1]),
    xskew: Number.parseFloat(pgwParams[2]),
    yscale: Number.parseFloat(pgwParams[3]),
    xpos: Number.parseFloat(pgwParams[4]),
    ypos: Number.parseFloat(pgwParams[5]),
  }

  const left = pgwParamsObj.xpos
  const top = pgwParamsObj.ypos
  const right = pgwParamsObj.xpos + pgwParamsObj.xscale * dimensions.width + pgwParamsObj.yskew * dimensions.height
  const bottom = pgwParamsObj.ypos + pgwParamsObj.xskew * dimensions.width + pgwParamsObj.yscale * dimensions.height

  const xmlBuffer = await fs.readFile(xmlPath) as Buffer
  const xmlDoc = new DOMParser().parseFromString(xmlBuffer.toString())
  const wktElement = xmlDoc.getElementsByTagName('WKT')[0]
  const wkt = wktElement.textContent
  const proj = proj4(wkt)
  const [minLng, minLat] = proj.inverse([left, bottom])
  const [maxLng, maxLat] = proj.inverse([right, top])
  return [minLng, minLat, maxLng, maxLat]
}
