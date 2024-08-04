import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import { splitGeojaon2PbfFiles } from '@gis-tools'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

fs.readJson(path.join(__dirname, 'chain_province.geojson')).then((geojson) => {
  const data = geojson as GeoJSON.FeatureCollection
  data.features.forEach((feature) => {
    feature.properties = {
      name: feature.properties.name,
      adcode: feature.properties.gb.replace('156', ''),
    }
  })
  splitGeojaon2PbfFiles(data, {
    outputDir: path.join(__dirname, 'province'),
    // goupBy: feature => feature.properties.adcode.slice(0, 4).toString().padEnd(6, '0')
    goupBy: feature => '000000'
  })
})
