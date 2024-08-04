import { SingleBar } from 'cli-progress'
import chalk from 'chalk'

interface ProgressBarConfig {
  duration: number
  current: number
}

export default class ProgressBar {
  _config: ProgressBarConfig = {
    duration: 100,
    current: 0,
  }

  _current: number = 0
  _startTime: number = 0
  _bar: SingleBar

  constructor(config: Partial<ProgressBarConfig> = {}) {
    this.initConfig(config)
  }

  async initConfig(config: Partial<ProgressBarConfig>) {
    this._bar = new SingleBar({
      format: `${chalk.blue('{bar}')} {percentage}% | {value}/{total} | {duration_formatted}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    })

    const defaultConfig: ProgressBarConfig = {
      duration: 100,
      current: 0,
    }
    Object.assign(defaultConfig, config)

    this._config = defaultConfig
    this._current = defaultConfig.current
    this._startTime = Date.now()
    // eslint-disable-next-line no-console
    console.log(chalk.cyanBright(`\n开始时间：${new Date().toLocaleString()}\n`))
    this._bar.start(config.duration, config.current)
  }

  async run(current?: number) {
    current = current || this._current + 1
    this._current = current
    this._bar.increment()
    const { duration } = this._config
    const len = Math.floor(current * 100 / duration)
    if (len === 100) {
      this._bar.stop()
      // eslint-disable-next-line no-console
      console.log(chalk.greenBright(`\n处理完成！总耗时：${Date.now() - this._startTime}ms\n`))
    }
  }

  async stop() {
    this._bar.stop()
    // eslint-disable-next-line no-console
    console.log(chalk.greenBright('\n'))
  }
}
