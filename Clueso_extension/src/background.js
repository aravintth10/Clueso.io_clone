// background.js (PRODUCTION-READY)
// Service worker for Chrome Extension recording system

const OFFSCREEN_URL = "offscreen.html";
const NODE_API_BASE = "http://localhost:3001/api/recording";
const FRONTEND_BASE = "http://localhost:3000/recording";

let eventBuffer = [];
let currentTabId = null;
let currentSessionId = null;
let isRecording = false;

/* ================= MESSAGE LISTENER ================= */

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  try {
    /* ---------- START RECORDING ---------- */
    if (msg?.type === "START_RECORDING") {
      if (isRecording) {
        console.warn("[background] Already recording");
        sendResponse({ success: false, error: "Already recording" });
        return true;
      }

      isRecording = true;
      eventBuffer = [];
      currentTabId = null;
      currentSessionId = generateSessionId();

      await chrome.storage.local.set({
        isRecording: true,
        currentSessionId,
      });

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // ✅ FIX #1: Block restricted URLs
      if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
        console.warn("[background] ❌ Cannot record restricted URL:", tab?.url);
        isRecording = false;
        await chrome.storage.local.set({ isRecording: false });
        sendResponse({ success: false, error: "Cannot record this page" });
        return true;
      }

      currentTabId = tab.id;

      // Inject content script
      await injectContentScript(tab.id);

      // Start content script recording
      try {
        await sendMessageWithRetry(tab.id, {
          type: "START_RECORDING",
          sessionId: currentSessionId,
        });
      } catch (err) {
        console.warn("[background] Content script start failed:", err.message);
      }

      // Start offscreen recording
      await ensureOffscreen();
      await waitForOffscreen();

      chrome.runtime.sendMessage({
        type: "OFFSCREEN_START",
        sessionId: currentSessionId,
      });

      console.log("[background] 🎬 Recording started:", currentSessionId);
      sendResponse({ success: true, sessionId: currentSessionId });
      return true;
    }

    /* ---------- STOP RECORDING ---------- */
    if (msg?.type === "STOP_RECORDING") {
      if (!isRecording) {
        console.warn("[background] Not recording");
        sendResponse({ success: false, error: "Not recording" });
        return true;
      }

      isRecording = false;
      await chrome.storage.local.set({ isRecording: false });

      let finalSessionId = currentSessionId;
      let sessionDataSent = false;

      // Try to get events from content script
      if (currentTabId) {
        try {
          const res = await sendMessageWithRetry(
            currentTabId,
            { type: "STOP_RECORDING" },
            3,
            300
          );

          if (res?.sessionData) {
            finalSessionId = res.sessionData.sessionId;
            await sendToNode(res.sessionData);
            sessionDataSent = true;
          }
        } catch (err) {
          console.warn("[background] Content script stop failed:", err.message);
        }
      }

      // Fallback: use buffered events
      if (!sessionDataSent) {
        console.log("[background] Using buffered events:", eventBuffer.length);
        await sendToNode({
          sessionId: finalSessionId,
          events: eventBuffer,
          startTime: Date.now() - 60000,
          endTime: Date.now(),
          url: "unknown",
          viewport: { width: 0, height: 0 },
        });
      }

      // Stop offscreen recording
      chrome.runtime.sendMessage({
        type: "OFFSCREEN_STOP",
        sessionId: finalSessionId,
      });

      // ✅ FIX #3: Redirect to FRONTEND (port 3000)
      chrome.tabs.create({
        url: `${FRONTEND_BASE}/${finalSessionId}`,
      });

      console.log("[background] 🛑 Recording stopped:", finalSessionId);

      // Cleanup
      eventBuffer = [];
      currentTabId = null;
      currentSessionId = null;

      sendResponse({ success: true, sessionId: finalSessionId });
      return true;
    }

    /* ---------- EVENT BUFFER ---------- */
    if (msg?.type === "EVENT_CAPTURED" && isRecording) {
      eventBuffer.push(msg.event);
    }

    /* ---------- OFFSCREEN PING ---------- */
    if (msg?.type === "OFFSCREEN_PING") {
      sendResponse({ ready: true });
      return true;
    }
  } catch (err) {
    console.error("[background] ❌ Error:", err);
    sendResponse({ success: false, error: err.message });
  }

  return true;
});

/* ================= HELPERS ================= */

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ✅ FIX #1: Comprehensive restricted URL check
function isRestrictedUrl(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("chrome-search://") ||
    url.startsWith("devtools://")
  );
}

async function sendMessageWithRetry(tabId, msg, retries = 3, delay = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, msg);
    } catch (err) {
      if (i === retries - 1) {
        throw new Error("Content script not responding");
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function injectContentScript(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
      console.warn("[background] Cannot inject into restricted URL");
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"],
    });

    console.log("[background] ✅ Content script injected");
  } catch (err) {
    console.error("[background] Injection failed:", err.message);
  }
}

// ✅ FIX #2: Send to Node.js (port 3001), not Next.js
async function sendToNode(sessionData) {
  try {
    const fd = new FormData();
    fd.append("events", JSON.stringify(sessionData.events || []));
    fd.append("metadata", JSON.stringify(sessionData));

    const response = await fetch(`${NODE_API_BASE}/process-recording`, {
      method: "POST",
      body: fd,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log("[background] ✅ Node.js response:", result);
    return result;
  } catch (err) {
    console.error("[background] ❌ Failed to send to Node:", err);
    throw err;
  }
}

/* ================= OFFSCREEN ================= */

let creating = false;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (creating) {
    // Wait for creation to complete
    while (!(await chrome.offscreen.hasDocument())) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return;
  }

  creating = true;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["DISPLAY_MEDIA", "USER_MEDIA"],
      justification: "Screen + mic recording",
    });
    console.log("[background] ✅ Offscreen created");
  } catch (err) {
    console.error("[background] Offscreen creation failed:", err);
  } finally {
    creating = false;
  }
}

async function waitForOffscreen(retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 1000);
        chrome.runtime.sendMessage({ type: "OFFSCREEN_PING" }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      if (res?.ready) {
        console.log("[background] ✅ Offscreen ready");
        return true;
      }
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  console.warn("[background] ⚠️ Offscreen not ready");
  return false;
}

/* ================= KEEP ALIVE ================= */

chrome.alarms.create("keepAlive", { periodInMinutes: 0.33 });
chrome.alarms.onAlarm.addListener(() => {
  chrome.runtime.getPlatformInfo(() => { });
});

console.log("[background] ✅ Service Worker Ready");
