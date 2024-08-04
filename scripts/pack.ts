import assert from 'node:assert'
import { execSync as exec } from 'node:child_process'
import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import fg from 'fast-glob'
import consola from 'consola'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = path.resolve(__dirname, '..')

assert(process.cwd() !== __dirname)

const FILES_COPY_ROOT = [
  'LICENSE',
]

async function pack() {
  consola.start('Copying files...')
  for (const file of FILES_COPY_ROOT) {
    await fs.copyFile(path.join(rootDir, file), path.join(rootDir, 'dist', file))
  }

  const packageJSON = await fs.readJSON(path.join(rootDir, 'package.json'))
  packageJSON.scripts = {}
  packageJSON.devDependencies = {}
  delete packageJSON.type
  await fs.writeJSON(path.join(rootDir, 'dist/package.json'), packageJSON, { spaces: 2 })
  consola.success('Copied files')

  consola.start('Packing...')
  exec('npm pack -s', { stdio: 'inherit', cwd: path.resolve(rootDir, 'dist') })
  const outputFiles = await fg('*.tgz', { cwd: path.resolve(rootDir, 'dist') })
  outputFiles.forEach((file) => {
    fs.move(path.resolve(rootDir, 'dist', file), path.resolve(rootDir, file), { overwrite: true })
  })
  consola.success('Packed')

  consola.start('Cleaning up...')
  await fs.remove(path.resolve(rootDir, 'dist', 'package.json'))
  for (const file of FILES_COPY_ROOT) {
    await fs.remove(path.resolve(rootDir, 'dist', file))
  }

  consola.success(`Pack success: ${path.resolve(rootDir, outputFiles.join(','))}`)
}

pack()
