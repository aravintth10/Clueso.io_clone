// offscreen.js (REWRITTEN - PRODUCTION-READY)
// Handles screen + microphone recording in offscreen document

console.log("[offscreen] Loaded");

/* ================= STATE ================= */

let sessionId = null;
let screenStream = null;
let micStream = null;
let combinedStream = null;
let mediaRecorder = null;

let chunkSeq = 0;
let isRecording = false;
let isStopping = false;
let pendingUploads = [];
let recordedChunks = [];

/* ================= CONFIG ================= */

const NODE_API_BASE = "http://localhost:3001/api/recording";
const CHUNK_UPLOAD_URL = `${NODE_API_BASE}/video-chunk`;

/* ================= MESSAGING ================= */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg?.type === "OFFSCREEN_PING") {
      sendResponse({ ready: true });
      return true;
    }

    if (msg?.type === "OFFSCREEN_START") {
      if (isRecording) {
        sendResponse({ success: false, error: "Already recording" });
        return true;
      }

      sessionId = msg.sessionId;
      console.log("[offscreen] START session:", sessionId);

      startRecording()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));

      return true;
    }

    if (msg?.type === "OFFSCREEN_STOP") {
      console.log("[offscreen] STOP session:", sessionId);

      stopRecording()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));

      return true;
    }
  } catch (err) {
    console.error("[offscreen] Message error:", err);
    sendResponse({ success: false, error: err.message });
  }

  return true;
});

/* ================= RECORDING ================= */

async function startRecording() {
  try {
    isRecording = true;
    isStopping = false;
    pendingUploads = [];
    recordedChunks = [];
    chunkSeq = 0;

    console.log("[offscreen] 🎤 Requesting microphone...");

    // Get microphone
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    console.log("[offscreen] ✅ Microphone acquired");

    console.log("[offscreen] 🖥️ Requesting screen...");

    // Get screen
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 30,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false,
    });

    console.log("[offscreen] ✅ Screen acquired");

    // Combine streams
    combinedStream = new MediaStream();

    // Add video track from screen
    screenStream.getVideoTracks().forEach(track => {
      console.log("[offscreen] Adding video track:", track.label);
      combinedStream.addTrack(track);
    });

    // Add audio track from microphone
    micStream.getAudioTracks().forEach(track => {
      console.log("[offscreen] Adding audio track:", track.label);
      combinedStream.addTrack(track);
    });

    console.log("[offscreen] Combined stream tracks:", combinedStream.getTracks().length);

    // Try multiple codec configurations
    const codecOptions = [
      { mimeType: "video/webm;codecs=vp8,opus" },
      { mimeType: "video/webm;codecs=vp9,opus" },
      { mimeType: "video/webm" },
      {} // No options
    ];

    let options = {};
    for (const opt of codecOptions) {
      if (!opt.mimeType || MediaRecorder.isTypeSupported(opt.mimeType)) {
        console.log("[offscreen] Using codec:", opt.mimeType || "default");
        options = opt;
        break;
      }
    }

    // Check if codec is supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn("[offscreen] vp8,opus not supported, trying vp9");
      options.mimeType = "video/webm;codecs=vp9,opus";

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn("[offscreen] vp9,opus not supported, using default");
        delete options.mimeType;
      }
    }

    console.log("[offscreen] Creating MediaRecorder with:", options);

    mediaRecorder = new MediaRecorder(combinedStream, options);

    console.log("[offscreen] MediaRecorder state:", mediaRecorder.state);
    console.log("[offscreen] MediaRecorder mimeType:", mediaRecorder.mimeType);

    // Event handlers
    mediaRecorder.ondataavailable = (event) => {
      console.log("[offscreen] 📹 Data available:", event.data.size, "bytes");

      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
        uploadChunk(event.data);
      } else {
        console.warn("[offscreen] ⚠️ Empty data chunk received");
      }
    };

    mediaRecorder.onstart = () => {
      console.log("[offscreen] ▶️ MediaRecorder started");
    };

    mediaRecorder.onstop = () => {
      console.log("[offscreen] ⏹️ MediaRecorder stopped");
      console.log("[offscreen] Total chunks recorded:", recordedChunks.length);
    };

    mediaRecorder.onerror = (event) => {
      console.error("[offscreen] ❌ MediaRecorder error:", event);
    };

    mediaRecorder.onpause = () => {
      console.log("[offscreen] ⏸️ MediaRecorder paused");
    };

    mediaRecorder.onresume = () => {
      console.log("[offscreen] ▶️ MediaRecorder resumed");
    };

    // Start recording with 1 second chunks
    console.log("[offscreen] Starting MediaRecorder with 1000ms timeslice...");
    try {
      mediaRecorder.start(1000);
    } catch (err) {
      console.error("[offscreen] ❌ start() failed:", err.message);
      throw err;
    }

    console.log("[offscreen] 🎬 Recording started successfully");
    console.log("[offscreen] MediaRecorder state after start:", mediaRecorder.state);

  } catch (err) {
    console.error("[offscreen] ❌ Start failed:", err);
    cleanup();
    throw err;
  }
}

/* ================= STOP ================= */

async function stopRecording() {
  if (!isRecording || isStopping) {
    console.warn("[offscreen] Not recording or already stopping");
    return;
  }

  isStopping = true;
  console.log("[offscreen] Stopping recording...");

  try {
    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      console.log("[offscreen] Stopping MediaRecorder...");
      mediaRecorder.stop();
    }

    // Wait for pending uploads
    console.log("[offscreen] Waiting for", pendingUploads.length, "uploads...");

    await Promise.race([
      Promise.allSettled(pendingUploads),
      new Promise((res) => setTimeout(res, 10000)),
    ]);

    console.log("[offscreen] ✅ All uploads complete");
    console.log("[offscreen] Total chunks uploaded:", chunkSeq);

  } catch (err) {
    console.error("[offscreen] Stop error:", err);
  } finally {
    cleanup();
    console.log("[offscreen] 🛑 Recording stopped");
  }
}

/* ================= UPLOAD ================= */

function uploadChunk(blob) {
  if (isStopping || !sessionId) {
    console.warn("[offscreen] Skipping chunk upload (stopping or no session)");
    return;
  }

  const currentSeq = chunkSeq++;

  console.log(`[offscreen] 📤 Uploading chunk ${currentSeq}`);
  console.log(`[offscreen]    Size: ${blob.size} bytes`);
  console.log(`[offscreen]    Type: ${blob.type}`);
  console.log(`[offscreen]    URL: ${CHUNK_UPLOAD_URL}`);

  const fd = new FormData();
  fd.append("sessionId", sessionId);
  fd.append("sequence", currentSeq);
  fd.append("chunk", blob);

  const uploadPromise = fetch(CHUNK_UPLOAD_URL, {
    method: "POST",
    body: fd,
  })
    .then((r) => {
      console.log(`[offscreen] Chunk ${currentSeq} response: ${r.status} ${r.statusText}`);

      if (!r.ok) {
        return r.text().then(text => {
          throw new Error(`Upload failed: ${r.status} - ${text}`);
        });
      }

      return r.json();
    })
    .then((data) => {
      console.log(`[offscreen] ✅ Chunk ${currentSeq} uploaded successfully`);
    })
    .catch((err) => {
      console.error(`[offscreen] ❌ Chunk ${currentSeq} upload failed:`, err);
      console.error(`[offscreen] Error details:`, {
        message: err.message,
        url: CHUNK_UPLOAD_URL,
        sessionId: sessionId,
        sequence: currentSeq,
        blobSize: blob.size
      });
    });

  pendingUploads.push(uploadPromise);
}

/* ================= CLEANUP ================= */

function cleanup() {
  try {
    console.log("[offscreen] Cleaning up...");

    if (combinedStream) {
      combinedStream.getTracks().forEach((track) => {
        console.log("[offscreen] Stopping track:", track.label);
        track.stop();
      });
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
    }
  } catch (err) {
    console.error("[offscreen] Cleanup error:", err);
  }

  screenStream = null;
  micStream = null;
  combinedStream = null;
  mediaRecorder = null;
  isRecording = false;
  isStopping = false;
  sessionId = null;
  pendingUploads = [];
  recordedChunks = [];
}

console.log("[offscreen] ✅ Ready");
