const fs = require('fs')
const path = require('path')

try {
  const dvrDir = process.env.DVR_DIR || '/app/dvr'
  
  if (!fs.existsSync(dvrDir)) {
    console.error('DVR directory not accessible')
    process.exit(1)
  }
  
  const logDir = process.env.LOG_DIR || '/app/logs'
  
  if (!fs.existsSync(logDir)) {
    console.error('Log directory not accessible')
    process.exit(1)
  }
  
  const logFile = path.join(logDir, 'dvr-cleaner.log')
  
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile)
    const lastModified = stats.mtime.getTime()
    const now = Date.now()
    
    if (now - lastModified > 5 * 60 * 1000) {
      console.error('Process appears to be stuck - no recent log activity')
      process.exit(1)
    }
  }
  
  console.log('Health check passed')
  process.exit(0)
  
} catch (error) {
  console.error('Health check failed:', error.message)
  process.exit(1)
}
