const fs = require("fs");
const path = require("path");

const recordingService = require("../services/recording-service");
const DeepgramService = require("../services/deepgram-service");
const pythonController = require("./python-controller");
const FrontendService = require("../services/frontend-service");
const { Logger } = require("../config");

/* =========================================================
   VIDEO CHUNK UPLOAD
========================================================= */
exports.uploadVideoChunk = async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    const sequence = parseInt(req.body.sequence);
    const chunk = req.file?.buffer;

    if (!sessionId || !chunk) {
      return res.status(400).json({ error: "sessionId and chunk required" });
    }

    Logger.info(
      `[CONTROLLER] Video chunk | session=${sessionId} seq=${sequence}`
    );

    await recordingService.saveChunk({
      sessionId,
      type: "video",
      chunk,
      sequence,
      requestId: req.requestId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    Logger.error("[CONTROLLER] Video chunk error:", err);
    return res.status(500).json({ error: "Failed to save video chunk" });
  }
};

/* =========================================================
   AUDIO CHUNK UPLOAD
========================================================= */
exports.uploadAudioChunk = async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    const sequence = parseInt(req.body.sequence);
    const chunk = req.file?.buffer;

    if (!sessionId || !chunk) {
      return res.status(400).json({ error: "sessionId and chunk required" });
    }

    Logger.info(
      `[CONTROLLER] Audio chunk | session=${sessionId} seq=${sequence}`
    );

    await recordingService.saveChunk({
      sessionId,
      type: "audio",
      chunk,
      sequence,
      requestId: req.requestId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    Logger.error("[CONTROLLER] Audio chunk error:", err);
    return res.status(500).json({ error: "Failed to save audio chunk" });
  }
};

/* =========================================================
   TRANSCRIBE AUDIO (DEEPGRAM)
========================================================= */
exports.transcribeAudio = async (audioPath, sessionId) => {
  try {
    if (!audioPath || !fs.existsSync(audioPath)) {
      Logger.warn(
        `[Recording Controller] No audio found for session ${sessionId}`
      );
      return null;
    }

    Logger.info(`[Recording Controller] Transcribing audio: ${audioPath}`);

    const transcription = await DeepgramService.transcribeFile(audioPath);

    FrontendService.sendAudio(sessionId, {
      filename: path.basename(audioPath),
      path: `/recordings/${path.basename(audioPath)}`,
      text: transcription.text,
      timestamp: new Date().toISOString(),
    });

    return transcription;
  } catch (err) {
    Logger.error("[Recording Controller] Deepgram error:", err);

    // ✅ FIXED: correct method name
    FrontendService.sendInstruction(sessionId, {
      id: Date.now(),
      text: "❌ Transcription failed",
      metadata: { error: err.message },
      timestamp: new Date().toISOString(),
    });

    return null;
  }
};

/* =========================================================
   PROCESS RECORDING (FINAL PIPELINE)
========================================================= */
exports.processRecording = async (req, res) => {
  try {
    const events = req.body.events ? JSON.parse(req.body.events) : [];
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    const videoPath = req.files?.video?.[0]?.path || null;
    const audioPath = req.files?.audio?.[0]?.path || null;

    Logger.info(
      `[Recording Controller] Processing recording | session=${metadata.sessionId}`
    );

    // ---- FINALIZE FILES ----
    const result = await recordingService.processRecording({
      events,
      metadata,
      videoPath,
      audioPath,
    });

    const sessionId = result.sessionId;

    /* -----------------------------------------------------
       1. SEND VIDEO IMMEDIATELY
    ----------------------------------------------------- */
    if (result.videoPath) {
      FrontendService.sendVideo(sessionId, {
        filename: path.basename(result.videoPath),
        path: `/recordings/${path.basename(result.videoPath)}`,
        metadata,
        timestamp: new Date().toISOString(),
      });
    }

    /* -----------------------------------------------------
       2. TRANSCRIBE AUDIO
    ----------------------------------------------------- */
    const transcription = await exports.transcribeAudio(
      result.audioPath,
      sessionId
    );

    /* -----------------------------------------------------
       3. AI PROCESSING (OPTIONAL)
    ----------------------------------------------------- */
    let aiResult = null;

    if (transcription?.text) {
      aiResult = await pythonController.processWithAI(
        transcription.text,
        events,
        metadata,
        transcription,
        sessionId,
        result.audioPath,
        result.videoPath
      );
    }

    /* -----------------------------------------------------
       4. FINAL GUARANTEED EMIT (THIS FIXES UI STUCK STATE)
    ----------------------------------------------------- */
    Logger.info(
      `[Recording Controller] FINAL emit → session ${sessionId}`
    );

    FrontendService.sendInstruction(sessionId, {
      id: Date.now(),
      text: "✅ Recording processed successfully",
      timestamp: new Date().toISOString(),
    });

    /* -----------------------------------------------------
       5. RESPONSE
    ----------------------------------------------------- */
    return res.status(200).json({
      success: true,
      sessionId,
      transcription: transcription?.text || null,
      aiProcessed: !!aiResult,
    });
  } catch (err) {
    Logger.error("[Recording Controller] Process error:", err);

    return res.status(500).json({
      error: "Failed to process recording",
      message: err.message,
    });
  }
};
