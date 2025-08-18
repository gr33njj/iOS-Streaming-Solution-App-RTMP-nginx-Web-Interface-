const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { CronJob } = require('cron');

// Конфигурация
const config = {
    dvrDir: process.env.DVR_DIR || '/app/dvr',
    retentionMinutes: parseInt(process.env.RETENTION_MINUTES) || 15,
    checkIntervalSeconds: parseInt(process.env.CHECK_INTERVAL_SECONDS) || 30,
    logDir: process.env.LOG_DIR || '/app/logs'
};

// Логирование
class Logger {
    constructor(logDir) {
        this.logDir = logDir;
        fs.ensureDirSync(logDir);
    }

    log(level, message, data = null) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const logMessage = {
            timestamp,
            level,
            message,
            data
        };

        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');

        const logFile = path.join(this.logDir, 'dvr-cleaner.log');
        const logLine = JSON.stringify(logMessage) + '\n';
        
        fs.appendFile(logFile, logLine, (err) => {
            if (err) console.error('Failed to write log:', err);
        });
    }

    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
}

const logger = new Logger(config.logDir);

// DVR Cleaner Class
class DVRCleaner {
    constructor(dvrDir, retentionMinutes) {
        this.dvrDir = dvrDir;
        this.retentionMinutes = retentionMinutes;
        this.stats = {
            totalFiles: 0,
            deletedFiles: 0,
            totalSize: 0,
            deletedSize: 0,
            lastCleanup: null,
            errors: 0
        };
    }

    async cleanup() {
        const startTime = Date.now();
        logger.info('Starting DVR cleanup', { 
            dvrDir: this.dvrDir, 
            retentionMinutes: this.retentionMinutes 
        });

        try {
            this.stats = {
                totalFiles: 0,
                deletedFiles: 0,
                totalSize: 0,
                deletedSize: 0,
                errors: 0
            };

            if (!(await fs.pathExists(this.dvrDir))) {
                logger.warn('DVR directory does not exist', { dvrDir: this.dvrDir });
                return this.stats;
            }

            const cutoffTime = moment().subtract(this.retentionMinutes, 'minutes');
            await this.cleanupDirectory(this.dvrDir, cutoffTime);
            await this.removeEmptyDirectories(this.dvrDir);

            const duration = Date.now() - startTime;
            this.stats.lastCleanup = new Date().toISOString();

            logger.info('DVR cleanup completed', {
                duration: `${duration}ms`,
                stats: this.stats
            });

        } catch (error) {
            logger.error('DVR cleanup failed', { error: error.message });
            this.stats.errors++;
        }

        return this.stats;
    }

    async cleanupDirectory(dirPath, cutoffTime) {
        try {
            const items = await fs.readdir(dirPath);

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                
                try {
                    const stat = await fs.stat(itemPath);

                    if (stat.isDirectory()) {
                        await this.cleanupDirectory(itemPath, cutoffTime);
                    } else if (stat.isFile()) {
                        this.stats.totalFiles++;
                        this.stats.totalSize += stat.size;

                        const fileTime = moment(stat.mtime);
                        
                        if (fileTime.isBefore(cutoffTime)) {
                            await this.deleteFile(itemPath, stat.size);
                        }
                    }
                } catch (error) {
                    logger.error('Error processing item', { 
                        item: itemPath, 
                        error: error.message 
                    });
                    this.stats.errors++;
                }
            }
        } catch (error) {
            logger.error('Error reading directory', { 
                directory: dirPath, 
                error: error.message 
            });
            this.stats.errors++;
        }
    }

    async deleteFile(filePath, fileSize) {
        try {
            await fs.unlink(filePath);
            this.stats.deletedFiles++;
            this.stats.deletedSize += fileSize;
            
            logger.info('File deleted', { 
                file: filePath, 
                size: this.formatBytes(fileSize) 
            });
        } catch (error) {
            logger.error('Failed to delete file', { 
                file: filePath, 
                error: error.message 
            });
            this.stats.errors++;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Создаем экземпляр cleaner
const cleaner = new DVRCleaner(config.dvrDir, config.retentionMinutes);

const performCleanup = async () => {
    try {
        await cleaner.cleanup();
    } catch (error) {
        logger.error('Cleanup task failed', { error: error.message });
    }
};

logger.info('DVR Cleaner starting', config);
performCleanup();

const cronPattern = `*/${config.checkIntervalSeconds} * * * * *`;
const job = new CronJob(cronPattern, performCleanup, null, true);

logger.info('Cleanup schedule configured', { 
    pattern: cronPattern, 
    intervalSeconds: config.checkIntervalSeconds 
});

const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    if (job) {
        job.stop();
        logger.info('Cleanup job stopped');
    }
    
    setTimeout(() => {
        logger.info('DVR Cleaner shutdown complete');
        process.exit(0);
    }, 1000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { DVRCleaner, Logger };
