import assert from 'node:assert'
import { execSync as exec } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import consola from 'consola'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const watch = process.argv.includes('--watch')

assert(process.cwd() !== __dirname)

async function buildMetaFiles() { }

async function build() {
  consola.info('Clean Up')
  exec('npm run clean', { stdio: 'inherit' })

  consola.info('Rollup')
  exec(`npm run build:rollup${watch ? ' -- --watch' : ''}`, { stdio: 'inherit' })

  await buildMetaFiles()
}

build()
