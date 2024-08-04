import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { imgPgwBounds } from '@gis-tools'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const name = 'example'
const imgPath = path.join(__dirname, `${name}.png`)
const pgwPath = path.join(__dirname, `${name}.pgw`)
const xmlPath = path.join(__dirname, `${name}.xml`)

imgPgwBounds(imgPath, pgwPath, xmlPath).then((bounds) => {
  console.log(bounds)
})
