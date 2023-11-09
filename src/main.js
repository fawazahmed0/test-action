const core = require('@actions/core')
const exec = require('@actions/exec')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const cred = core.getInput('credentials')
    let credOption = ''

    if (cred) credOption = `-c ${cred}`

    if (os.type() == 'Darwin') {
      await exec.exec('brew install ttyd cloudflare/cloudflare/cloudflared')
      await exec.exec(`ttyd -p 8391 -a -W ${credOption} bash &`)
      await exec.exec('cloudflared tunnel --url http://localhost:8391 > mylog.txt 2>&1 &')
    } else if (os.type() == 'Linux') {
      await exec.exec(
        'wget -O ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.4/ttyd.aarch64'
      )
      await exec.exec(
        'wget -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64'
      )
      await exec.exec('chmod 777 ttyd')
      await exec.exec('chmod 777 cloudflared')
      await exec.exec(`./ttyd -p 8391 -a -W ${credOption} bash &`)
      await exec.exec('./cloudflared tunnel --url http://localhost:8391 > mylog.txt 2>&1 &')
    } else if (os.type() == 'Windows_NT') {
      await exec.exec(
        'wget -O ttyd.exe https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.win32.exe'
      )
      await exec.exec(
        'wget -O cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
      )
      await exec.exec(`./ttyd.exe -p 8391 -a -W ${credOption} bash &`)
      await exec.exec('./cloudflared.exe tunnel --url http://localhost:8391  > mylog.txt 2>&1 &')
    }

    let continuePath1 = path.join(__dirname, 'continue')
    let continuePath2 = path.join(process.env.GITHUB_WORKSPACE, 'continue')
    await sleep(30_000)

    let logfile = path.join(process.env.GITHUB_WORKSPACE, 'mylog.txt')
    let content = await fs.readFile(logfile,{encoding:'utf8'})
    let url = Array.from(content.matchAll(/-{10,}.*?(?<url>https?:\/\/.*?)\s.*?-{10,}/sgi))?.[0]?.groups?.url
    await fs.rm(e, { recursive: true, force: true })

    while (
      !(await fileExists(continuePath1)) &&
      !(await fileExists(continuePath2))
    ) {
      await sleep(5000)
      core.debug(url)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

async function fileExists(pathToFile) {
  try {
    await fs.access(pathToFile, fs.constants.F_OK)
    return true
  } catch (e) {
    return false
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
  run
}
