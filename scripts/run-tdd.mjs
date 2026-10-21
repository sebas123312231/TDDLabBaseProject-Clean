import { spawn } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'

const reportPath = new URL('../script/report.json', import.meta.url)
await rm(reportPath, { force: true })

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['script/tddScript.js'], { stdio: 'inherit' })
  child.on('error', reject)
  child.on('close', resolve)
})

const report = JSON.parse(await readFile(reportPath, 'utf8'))
const hasValidCounts = ['numPassedTests', 'numFailedTests', 'numTotalTests'].every(
  (key) => Number.isSafeInteger(report[key]) && report[key] >= 0,
)
if (
  exitCode !== 0 ||
  !hasValidCounts ||
  report.numTotalTests < 1 ||
  report.success !== true ||
  report.numFailedTests !== 0
)
  process.exitCode = exitCode || 1
