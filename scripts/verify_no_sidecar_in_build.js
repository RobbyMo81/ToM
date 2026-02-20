const fs = require('fs')
const path = require('path')
const asar = require('asar')

async function findAsar() {
  const dist = path.resolve(process.cwd(), 'dist')
  if (!fs.existsSync(dist)) {
    console.error('dist directory not found; ensure electron:build ran with --dir')
    process.exit(2)
  }
  // Look for resources/app.asar in the build output
  const possible = []
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name)
      const stat = fs.statSync(p)
      if (stat.isDirectory()) walk(p)
      else if (name === 'app.asar') possible.push(p)
    }
  }
  walk(dist)
  return possible[0]
}

async function main() {
  const asarPath = await findAsar()
  if (!asarPath) {
    console.log('No app.asar found; nothing to verify.')
    return
  }

  console.log('Inspecting asar:', asarPath)
  const fileList = asar.listPackage(asarPath)
  const found = fileList.find((f) => f.includes('@spotlightjs/sidecar'))
  if (found) {
    console.error('Sidecar package found inside build:', found)
    process.exit(1)
  }
  console.log('No sidecar found inside app.asar — OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(3)
})
