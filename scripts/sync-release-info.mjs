import { createHash } from 'crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const outputPath = join(root, 'website', 'public', 'releases.json')

function sha256(filePath) {
  const buffer = readFileSync(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  return pkg.version
}

function findArtifact(pattern) {
  if (!existsSync(distDir)) {
    return null
  }

  const match = readdirSync(distDir).find((name) => pattern.test(name))
  return match ? join(distDir, match) : null
}

function readLatestYml() {
  const latestPath = join(distDir, 'latest.yml')
  if (!existsSync(latestPath)) {
    return null
  }

  const content = readFileSync(latestPath, 'utf8')
  const versionLine = content.split('\n').find((line) => line.startsWith('version:'))
  if (!versionLine) {
    return null
  }

  return { version: versionLine.replace('version:', '').trim() }
}

const version = readLatestYml()?.version ?? readPackageVersion()
const winArtifact = findArtifact(/职速达-Setup-.*\.exe$/i)
const macArtifact = findArtifact(/职速达-.*-mac\.dmg$/i)

const payload = {
  version,
  publishedAt: new Date().toISOString().slice(0, 10),
  windows: winArtifact
    ? {
        fileName: winArtifact.split(/[/\\]/).pop(),
        sha256: sha256(winArtifact),
        url: `https://github.com/zsrd-xto/zhisuda-desktop/releases/latest/download/${winArtifact.split(/[/\\]/).pop()}`
      }
    : null,
  mac: macArtifact
    ? {
        fileName: macArtifact.split(/[/\\]/).pop(),
        sha256: sha256(macArtifact),
        url: `https://github.com/zsrd-xto/zhisuda-desktop/releases/latest/download/${macArtifact.split(/[/\\]/).pop()}`
      }
    : null
}

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`[sync-release-info] wrote ${outputPath}`)
