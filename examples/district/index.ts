import path from 'node:path'
import { districtArrayToDict } from '@gis-tools'

districtArrayToDict(path.join(__dirname, 'example.json')).then((result) => {
  console.log(result)
})
