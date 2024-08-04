import path from 'node:path'
import { kml2Geojson } from '@gis-tools'

const kmlFile = path.join(__dirname, 'example.kml')
kml2Geojson(kmlFile).then((geojson) => {
  if (geojson.type === 'FeatureCollection') {
    console.log(geojson.features[0])
  }
})
