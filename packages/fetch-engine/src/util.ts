import os from 'os'
import makeDir from 'make-dir'
import fetch from 'node-fetch'
import findCacheDir from 'find-cache-dir'
import fs from 'fs'
import { promisify } from 'util'
import path from 'path'
import { getProxyAgent } from './getProxyAgent'

const exists = promisify(fs.exists)
const readFile = promisify(fs.readFile)

export async function getLocalLastModified(filePath: string): Promise<Date | null> {
  const fileExists = await exists(filePath)
  if (!fileExists) {
    return null
  }
  const file = await readFile(filePath, 'utf-8')
  if (!file || file.length === 0) {
    return null
  }
  return new Date(file)
}

export async function getRemoteLastModified(url: string): Promise<Date> {
  const response = await fetch(url, {
    method: 'HEAD',
    agent: getProxyAgent(url),
  })
  return new Date(response.headers.get('last-modified'))
}

export async function getRootCacheDir(): Promise<string> {
  if (os.platform() === 'win32') {
    const cacheDir = await findCacheDir({ name: 'prisma', create: true })
    if (cacheDir) {
      return cacheDir
    }
    if (process.env.APPDATA) {
      return path.join(process.env.APPDATA, 'Prisma')
    }
  }
  return path.join(os.homedir(), '.cache/prisma')
}

export async function getCacheDir(
  channel: string,
  version: string,
  platform: string,
  failSilent: boolean,
): Promise<string | null> {
  const rootCacheDir = await getRootCacheDir()
  const cacheDir = path.join(rootCacheDir, channel, version, platform)
  try {
    if (!fs.existsSync(cacheDir)) {
      await makeDir(cacheDir)
    }
  } catch (e) {
    if (failSilent) {
      return null
    } else {
      throw e
    }
  }
  return cacheDir
}

function rewriteKind(kind: string) {
  if (kind === 'query-engine') {
    return 'prisma'
  }

  return kind
}

export function getDownloadUrl(channel: string, version: string, platform: string, binaryName: string) {
  const extension = platform === 'windows' ? '.exe.gz' : '.gz'
  return `https://binaries.prisma.sh/${channel}/${version}/${platform}/${rewriteKind(binaryName)}${extension}`
}
