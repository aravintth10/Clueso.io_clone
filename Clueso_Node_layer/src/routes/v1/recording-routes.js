// routes/recording-routes.js (PRODUCTION-READY)
// ✅ All routes return JSON, never HTML

const express = require("express");
const router = express.Router();
const multer = require("multer");
const recordingController = require("../../controllers/recording-controller");

/* ================= MULTER CONFIG ================= */

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per chunk
});

const finalUpload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for files
    fieldSize: 50 * 1024 * 1024, // 50MB for field values
  },
});

/* ================= MIDDLEWARE ================= */

const requestLogger = (req, res, next) => {
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  console.log(`[ROUTE] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`[ROUTE] Request ID: ${requestId}`);
  next();
};

// ✅ FIX: Ensure JSON responses, never HTML
const ensureJsonResponse = (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
};

// ✅ FIX: Validate chunk upload parameters
const validateChunkUpload = (req, res, next) => {
  const { sessionId, sequence } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: "sessionId is required"
    });
  }

  if (sequence === undefined || sequence === null) {
    return res.status(400).json({
      success: false,
      error: "sequence is required"
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "chunk file is required"
    });
  }

  next();
};

// ✅ FIX: Validate process recording parameters
const validateProcessRecording = (req, res, next) => {
  try {
    // Try to parse events and metadata
    if (req.body.events) {
      try {
        JSON.parse(req.body.events);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid events JSON format"
        });
      }
    }

    if (req.body.metadata) {
      try {
        const metadata = JSON.parse(req.body.metadata);
        if (!metadata.sessionId) {
          return res.status(400).json({
            success: false,
            error: "metadata.sessionId is required"
          });
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid metadata JSON format"
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "metadata is required"
      });
    }

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: "Invalid request format",
      message: err.message
    });
  }
};

/* ================= ROUTES ================= */

// Video chunk upload
router.post(
  "/video-chunk",
  requestLogger,
  ensureJsonResponse,
  chunkUpload.single("chunk"),
  validateChunkUpload,
  recordingController.uploadVideoChunk
);

// Audio chunk upload
router.post(
  "/audio-chunk",
  requestLogger,
  ensureJsonResponse,
  chunkUpload.single("chunk"),
  validateChunkUpload,
  recordingController.uploadAudioChunk
);

// Final recording processing
router.post(
  "/process-recording",
  requestLogger,
  ensureJsonResponse,
  finalUpload.fields([
    { name: "events", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "metadata", maxCount: 1 },
  ]),
  validateProcessRecording,
  recordingController.processRecording
);

/* ================= ERROR HANDLER ================= */

router.use((err, req, res, next) => {
  console.error("[ROUTE] Error:", err);

  // ✅ Always return JSON, never HTML
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    requestId: req.requestId,
  });
});

module.exports = router;
