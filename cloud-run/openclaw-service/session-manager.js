
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');
const admin = require('firebase-admin');

/**
 * Manages backup and restore of WhatsApp sessions using Firebase Storage.
 * Firestore is used only for metadata (optional, skipping for now to keep it simple).
 * 
 * Why Storage?
 * WhatsApp sessions can be 10MB-500MB+ (Chromium profile).
 * Firestore 1MB document limit makes it unsuitable for full session persistence.
 */
class SessionManager {
    constructor(bucketName) {
        this.bucket = admin.storage().bucket(bucketName);
        this.sessionDir = path.resolve('./whatsapp-sessions');
        this.zipPath = path.resolve('./session-backup.zip');
        this.remoteFile = 'whatsapp-session.zip';
    }

    async restore() {
        try {
            console.log('[SessionManager] Checking for remote backup...');
            const file = this.bucket.file(this.remoteFile);
            const [exists] = await file.exists();

            if (!exists) {
                console.log('[SessionManager] No backup found. Starting fresh.');
                return false;
            }

            console.log('[SessionManager] Backup found. Downloading...');
            await file.download({ destination: this.zipPath });

            console.log('[SessionManager] Extracting backup...');
            await fs.ensureDir(this.sessionDir);
            await extract(this.zipPath, { dir: this.sessionDir });

            console.log('[SessionManager] Restore complete.');
            return true;
        } catch (error) {
            console.error('[SessionManager] Restore failed:', error);
            return false;
        }
    }

    async backup() {
        try {
            console.log('[SessionManager] Starting backup...');

            // Ensure session directory exists
            if (!await fs.pathExists(this.sessionDir)) {
                console.log('[SessionManager] No session directory to backup.');
                return false;
            }

            // Create ZIP
            const output = fs.createWriteStream(this.zipPath);
            const archive = archiver('zip', { zlib: { level: 1 } }); // Fast compression

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(this.sessionDir, false);
                archive.finalize();
            });

            console.log('[SessionManager] Uploading backup to Storage...');
            await this.bucket.upload(this.zipPath, {
                destination: this.remoteFile,
                metadata: { contentType: 'application/zip' }
            });

            console.log('[SessionManager] Backup complete.');
            return true;
        } catch (error) {
            console.error('[SessionManager] Backup failed:', error);
            return false;
        }
    }
}

module.exports = SessionManager;
