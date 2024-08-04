import path from 'node:path'
import chalk from 'chalk'
import consola from 'consola'
import fs from 'fs-extra'
import ProgressBar from './core/progress-bar'

/**
 * 替换文件夹中的所有文件文件名
 * @example
 * replaceFileNames('c:/Users/bedla/Desktop/gis-tools/src', 'utils', 'utils2');
 * replaceFileNames('c:/Users/bedla/Desktop/gis-tools/src', /utils/, 'utils2');
 * replaceFileNames('c:/Users/bedla/Desktop/gis-tools/src', /utils/, (substring: string, ...args: any[]) => {
 *   return 'utils2';
 * });
 * @param dir
 * @param replaceStr
 * @param replaceWith
 */
export async function replaceFileNames(dir: string, replaceStr: string | RegExp, replaceWith: string | ((substring: string, ...args: any[]) => string)): Promise<void> {
  const isExists = await fs.pathExists(dir)
  if (!isExists) {
    consola.error(chalk.red(`未找到 ${dir} 目录`))
    return
  }

  const files = await fs.readdir(dir)
  const progressBar = new ProgressBar({
    current: 0,
    duration: files.length,
  })
  files.forEach(async (file) => {
    const newFileName = file.replace(replaceStr, replaceWith as any)
    await fs.rename(path.join(dir, file), path.join(dir, newFileName))
    progressBar.run()
  })
}
