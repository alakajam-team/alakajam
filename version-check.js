const nodeVersion = new RegExp(/^v(\d+\.\d+)/).exec(process.version)[1]

if (!nodeVersion.startsWith('14')) {
  const yellowText = "\x1b[33m";
  console.warn(`${yellowText}${"WARNING ".repeat(12)}`)
  console.warn(`${yellowText}${"=".repeat(100)}`)
  console.warn(`${yellowText}Current Node version is ${nodeVersion}, while Alakajam! currently supports Node 14 only. You may encounter Webpack 4 errors or more.`)
  console.warn(`${yellowText}${"=".repeat(100)}`)
  console.warn(`${yellowText}${"WARNING ".repeat(12)}\n`)

  setTimeout(() => {
    process.exit(0)
  }, 1000)
}
