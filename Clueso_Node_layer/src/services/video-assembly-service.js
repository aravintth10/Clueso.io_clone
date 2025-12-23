const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { Logger } = require('../config');

class VideoAssemblyService {
    /**
     * Assemble final video by stitching AI audio into original video
     * 
     * @param {string} videoPath - Absolute path to original video (.webm)
     * @param {string} audioPath - Absolute path to processed AI audio (.mp3)
     * @param {string} sessionId - Session ID for naming the output
     * @returns {Promise<string>} - Path to the finalized video
     */
    async assembleVideo(videoPath, audioPath, sessionId) {
        return new Promise((resolve, reject) => {
            try {
                if (!fs.existsSync(videoPath)) {
                    throw new Error(`Original video not found at: ${videoPath}`);
                }
                if (!fs.existsSync(audioPath)) {
                    throw new Error(`AI audio not found at: ${audioPath}`);
                }

                const outputFilename = `final_video_${sessionId}.webm`;
                const outputPath = path.join(process.cwd(), 'recordings', outputFilename);

                Logger.info(`[Video Assembly] Starting assembly for session: ${sessionId}`);
                Logger.info(`[Video Assembly] Video: ${videoPath}`);
                Logger.info(`[Video Assembly] Audio: ${audioPath}`);
                Logger.info(`[Video Assembly] Output: ${outputPath}`);

                // Use fluent-ffmpeg to merge
                // -map 0:v -map 1:a copies video from first input and audio from second
                ffmpeg()
                    .input(videoPath)
                    .input(audioPath)
                    .outputOptions([
                        '-map 0:v',        // Use video from input 0
                        '-map 1:a',        // Use audio from input 1
                        '-c:v copy',       // Copy video codec (no re-encoding for speed)
                        '-c:a libopus',    // Transcode audio to Opus (standard for WEBM)
                        '-b:a 128k',       // Bitrate for audio
                        '-shortest'        // Finish when the shortest stream ends
                    ])
                    .on('start', (commandLine) => {
                        Logger.info(`[Video Assembly] FFMPEG started with command: ${commandLine}`);
                    })
                    .on('progress', (progress) => {
                        Logger.debug(`[Video Assembly] Processing: ${progress.percent}% done`);
                    })
                    .on('error', (err) => {
                        Logger.error(`[Video Assembly] Error assembling video: ${err.message}`);
                        reject(err);
                    })
                    .on('end', () => {
                        Logger.info(`[Video Assembly] Successfully assembled final video: ${outputFilename}`);
                        resolve(outputPath);
                    })
                    .save(outputPath);

            } catch (error) {
                Logger.error(`[Video Assembly] Processing setup error: ${error.message}`);
                reject(error);
            }
        });
    }
}

module.exports = new VideoAssemblyService();
