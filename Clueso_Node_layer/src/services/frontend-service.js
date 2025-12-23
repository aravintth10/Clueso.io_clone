const { Server } = require("socket.io");
const { Logger } = require("../config");

class FrontendService {
    static io = null;
    static activeSessions = new Map(); // sessionId -> Set of socket IDs
    static domEventsStore = new Map(); // sessionId -> events array
    static pythonInstructionsReceived = new Set(); // sessionIds that got Python instructions

    static initialize(httpServer) {
        if (this.io) return this.io;

        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
            },
        });

        this.io.on("connection", (socket) => {
            Logger.info(`[Frontend Service] Client connected: ${socket.id}`);

            socket.on("join-session", ({ sessionId }) => {
                Logger.info(
                    `[Frontend Service] Client ${socket.id} joined session ${sessionId}`
                );
                socket.join(sessionId);

                // Track active session
                if (!this.activeSessions.has(sessionId)) {
                    this.activeSessions.set(sessionId, new Set());
                }
                this.activeSessions.get(sessionId).add(socket.id);
            });

            socket.on("disconnect", () => {
                Logger.info(
                    `[Frontend Service] Client disconnected: ${socket.id}`
                );

                // Remove from all sessions
                for (const [sessionId, sockets] of this.activeSessions.entries()) {
                    if (sockets.has(socket.id)) {
                        sockets.delete(socket.id);
                        if (sockets.size === 0) {
                            this.activeSessions.delete(sessionId);
                        }
                    }
                }
            });
        });

        Logger.info("[Frontend Service] Socket.IO server initialized");
        return this.io;
    }

    // ---------- EMIT HELPERS ----------
    static sendInstruction(sessionId, payload) {
        if (!this.io) return false;
        this.io.to(sessionId).emit("instruction", payload);
        Logger.info(`[Frontend Service] Sent instruction to session: ${sessionId}`);
        return true;
    }

    // Alias for compatibility
    static sendInstructions(sessionId, payload, source = 'unknown') {
        if (source === 'python') {
            this.pythonInstructionsReceived.add(sessionId);
        }
        return this.sendInstruction(sessionId, payload);
    }

    static sendAudio(sessionId, payload) {
        if (!this.io) return false;
        this.io.to(sessionId).emit("audio", payload);
        Logger.info(`[Frontend Service] Sent audio to session: ${sessionId}`);
        return true;
    }

    static sendVideo(sessionId, payload) {
        if (!this.io) return false;
        this.io.to(sessionId).emit("video", payload);
        Logger.info(`[Frontend Service] Sent video to session: ${sessionId}`);
        return true;
    }

    // ---------- SESSION MANAGEMENT ----------
    static isSessionActive(sessionId) {
        return this.activeSessions.has(sessionId) &&
            this.activeSessions.get(sessionId).size > 0;
    }

    static getActiveSessionCount() {
        return this.activeSessions.size;
    }

    // ---------- DOM EVENTS STORAGE ----------
    static storeDomEvents(sessionId, events) {
        try {
            this.domEventsStore.set(sessionId, events);
            Logger.info(`[Frontend Service] Stored ${events.length} DOM events for session: ${sessionId}`);
            return true;
        } catch (err) {
            Logger.error(`[Frontend Service] Failed to store DOM events:`, err);
            return false;
        }
    }

    static sendDomEventsAsFallback(sessionId) {
        try {
            // Don't send if Python already sent instructions
            if (this.pythonInstructionsReceived.has(sessionId)) {
                Logger.info(`[Frontend Service] Skipping fallback - Python instructions already sent for session: ${sessionId}`);
                return false;
            }

            const events = this.domEventsStore.get(sessionId);
            if (!events || events.length === 0) {
                Logger.warn(`[Frontend Service] No DOM events available for session: ${sessionId}`);
                return false;
            }

            Logger.info(`[Frontend Service] Sending ${events.length} DOM events as fallback for session: ${sessionId}`);

            events.forEach((event, index) => {
                this.sendInstruction(sessionId, {
                    id: Date.now() + index,
                    type: event.type || 'dom_event',
                    text: `${event.type}: ${event.target?.text || event.target?.tag || 'Unknown'}`,
                    metadata: event,
                    timestamp: new Date().toISOString(),
                    source: 'dom_fallback'
                });
            });

            return true;
        } catch (err) {
            Logger.error(`[Frontend Service] Failed to send DOM events as fallback:`, err);
            return false;
        }
    }
}

module.exports = FrontendService;

