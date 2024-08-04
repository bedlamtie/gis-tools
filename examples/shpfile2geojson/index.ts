import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shp2GeoJSON } from '@gis-tools'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

shp2GeoJSON(path.join(__dirname, 'example.shp')).then((geojson) => {
  const jsonData = geojson as GeoJSON.FeatureCollection
  // TODO: Do something with the GeoJSON data
})
