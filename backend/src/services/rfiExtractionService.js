const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const RfiExtraction = require('../models/RfiExtraction');
const { getBucket } = require('../utils/gridfs');
const mongoose = require('mongoose');

const SCRIPT_PATH = path.join(__dirname, '../scripts/extract_rfi.py');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

function _downloadFromGridFS(fileId, destPath) {
    return new Promise((resolve, reject) => {
        const bucket = getBucket();
        const objId = new mongoose.Types.ObjectId(fileId);
        const downloadStream = bucket.openDownloadStream(objId);
        const writeStream = fs.createWriteStream(destPath);

        downloadStream.pipe(writeStream)
            .on('finish', () => resolve(destPath))
            .on('error', (err) => reject(new Error(`GridFS Download Error: ${err.message}`)));
    });
}

/**
 * runRfiExtraction
 * Spawns the python script and saves parsed RFI data to DB
 */
exports.runRfiExtraction = async (extractionId, fileRef) => {
    let localPath = fileRef;
    let isTemp = false;
    
    try {
        const rfiDoc = await RfiExtraction.findById(extractionId);
        if (!rfiDoc) {
            console.error('[RfiService] Extraction document not found.');
            return;
        }

        rfiDoc.status = 'processing';
        await rfiDoc.save();

        // ── GridFS Check ──────────────────────────────────────
        if (mongoose.Types.ObjectId.isValid(fileRef)) {
            const tempDir = path.join(__dirname, '../../uploads/temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            const tempFileName = `temp_rfi_${extractionId}_${Date.now()}.pdf`;
            localPath = path.join(tempDir, tempFileName);
            
            console.log(`[RfiService] Downloading GridFS file ${fileRef} to ${localPath}`);
            await _downloadFromGridFS(fileRef, localPath);
            isTemp = true;
        }

        if (!fs.existsSync(localPath)) {
            throw new Error(`PDF file not found at ${localPath}`);
        }

        console.log(`[RfiService] Starting Python RFI extraction for ${path.basename(localPath)}`);

        const output = await new Promise((resolve, reject) => {
            const process = spawn(PYTHON_BIN, [SCRIPT_PATH, localPath, rfiDoc.originalFileName]);
            let dataOut = '';
            let dataErr = '';

            process.stdout.on('data', (d) => dataOut += d.toString());
            process.stderr.on('data', (d) => dataErr += d.toString());

            process.on('close', (code) => {
                // Cleanup temp file
                if (isTemp && fs.existsSync(localPath)) {
                    try { fs.unlinkSync(localPath); } catch (_) {}
                    isTemp = false;
                }

                if (code !== 0) {
                    console.error('[RfiService] Python stderr:', dataErr);
                    reject(new Error(`Python exit code ${code}`));
                } else {
                    resolve(dataOut);
                }
            });
        });

        // The python script should print a JSON dictionary to stdout
        const match = output.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON found in python output");

        const result = JSON.parse(match[0]);
        if (!result.success) throw new Error(result.error);

        rfiDoc.rfis = result.rfis;
        rfiDoc.status = 'completed';
        await rfiDoc.save();

        console.log(`[RfiService] Done extracting RFI for ${path.basename(localPath)}. Extracted ${rfiDoc.rfis.length} items.`);

    } catch (err) {
        console.error('[RfiService] Failed extraction:', err);
        await RfiExtraction.findByIdAndUpdate(extractionId, {
            status: 'failed',
            errorDetails: err.message
        });
    }
};
