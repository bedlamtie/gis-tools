import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CRSTypesEnum, coordDecompilar } from '@gis-tools'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

coordDecompilar(path.resolve(__dirname, 'geopbf'), {
  jsonpath: path.resolve(__dirname, 'example.json'),
  output: path.resolve(__dirname, 'output.json'),
  jsonOptions: {
    // includeCode: '450000',
    centerPoint: true,
    latlngType: CRSTypesEnum.GCJ02,
    latlngField: 'coordinates'
  },
})
