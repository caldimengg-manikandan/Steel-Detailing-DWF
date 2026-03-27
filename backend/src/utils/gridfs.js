/**
 * ============================================================
 * GridFS Storage Engine Utility
 * ============================================================
 * Defines the Multer storage engine for uploading directly
 * to MongoDB Atlas via GridFS.
 */
const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');

let gfs;
let bucket;

// Note: This must be called AFTER mongoose.connect(...)
function initGridFS() {
    const conn = mongoose.connection;
    bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
    gfs = bucket;
    console.log('[GridFS] Bucket initialized: "uploads"');
}

const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);
                
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads',
                    metadata: {
                        originalName: file.originalname,
                        projectId: req.params.projectId,
                        adminId: req.principal ? req.principal.adminId : null,
                        type: file.fieldname // e.g. "drawings" or "rfis"
                    }
                };
                resolve(fileInfo);
            });
        });
    }
});

module.exports = {
    initGridFS,
    getGridFS: () => gfs,
    getBucket: () => bucket,
    storage
};
