"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useWebSocketConnection = (sessionId: string | null) => {
    const socketRef = useRef<Socket | null>(null);

    const [connectionState, setConnectionState] = useState<
        "connected" | "disconnected" | "connecting"
    >("connecting");

    const [instructions, setInstructions] = useState<any[]>([]);
    const [audioData, setAudioData] = useState<any | null>(null);
    const [videoData, setVideoData] = useState<any | null>(null);
    const [errors, setErrors] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // ✅ FIX: Fetch existing session data on mount
    useEffect(() => {
        if (!sessionId) return;

        const fetchSessionData = async () => {
            try {
                console.log(`[API] Fetching session data for: ${sessionId}`);
                const response = await fetch(
                    `${API_URL}/api/v1/frontend/session/${sessionId}/data`
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("[API] Session data received:", data);

                if (data.success && data.data) {
                    // Set video data if available
                    if (data.data.video) {
                        setVideoData({
                            filename: data.data.video.filename,
                            url: `${SOCKET_URL}${data.data.video.url}`,
                            metadata: data.data.video.metadata || data.data.metadata,
                            isFinal: data.data.video.isFinal || false,
                            receivedAt: new Date(data.data.video.receivedAt || Date.now()),
                        });
                    }

                    // Set audio data if available
                    if (data.data.audio) {
                        setAudioData({
                            filename: data.data.audio.filename,
                            url: `${SOCKET_URL}${data.data.audio.url}`,
                            text: data.data.audio.text || "",
                            receivedAt: new Date(data.data.audio.receivedAt || Date.now()),
                        });
                    }

                    // Set instructions/events if available
                    if (data.data.instructions && Array.isArray(data.data.instructions)) {
                        setInstructions(data.data.instructions);
                    }
                }

                setIsLoadingData(false);
            } catch (err: any) {
                console.error("[API] Failed to fetch session data:", err);
                setErrors((prev) => [
                    ...prev,
                    {
                        message: "Failed to load session data",
                        details: err.message,
                        timestamp: new Date(),
                    },
                ]);
                setIsLoadingData(false);
            }
        };

        fetchSessionData();
    }, [sessionId]);

    // Socket.IO connection
    useEffect(() => {
        if (!sessionId) return;

        console.log("[WS] Connecting →", SOCKET_URL);

        const socket = io(SOCKET_URL, {
            transports: ["websocket"],
            withCredentials: false,
        });

        socketRef.current = socket;

        // ---------- CONNECTION ----------
        socket.on("connect", () => {
            console.log("[WS] Connected:", socket.id);
            setConnectionState("connected");

            // MUST MATCH BACKEND
            socket.emit("join-session", { sessionId });
        });

        socket.on("disconnect", () => {
            console.log("[WS] Disconnected");
            setConnectionState("disconnected");
        });

        // ---------- DATA EVENTS ----------
        socket.on("instruction", (data) => {
            console.log("[WS] Received instruction:", data);
            setInstructions((prev) => [...prev, data]);
        });

        socket.on("audio", (data) => {
            console.log("[WS] Received audio:", data);
            setAudioData({
                filename: data.filename,
                url: `${SOCKET_URL}${data.path}`,
                text: data.text,
                receivedAt: new Date(data.timestamp),
            });
        });

        socket.on("video", (data) => {
            console.log("[WS] Received video:", data);
            setVideoData({
                filename: data.filename,
                url: `${SOCKET_URL}${data.path}`,
                metadata: data.metadata,
                isFinal: data.isFinal || false,
                receivedAt: new Date(data.timestamp),
            });
        });

        socket.on("error", (err) => {
            console.error("[WS] Error:", err);
            setErrors((prev) => [
                ...prev,
                {
                    message: err?.message || "Socket error",
                    timestamp: new Date(),
                },
            ]);
        });

        socket.onAny((event, ...args) => {
            console.log("[WS EVENT]", event, args);
        });

        // ---------- CLEANUP ----------
        return () => {
            console.log("[WS] Cleanup:", sessionId);
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            setConnectionState("disconnected");
        };
    }, [sessionId]);

    // ---------- HELPERS ----------
    const clearInstructions = useCallback(() => setInstructions([]), []);
    const clearAudio = useCallback(() => setAudioData(null), []);
    const clearVideo = useCallback(() => setVideoData(null), []);
    const removeInstruction = useCallback((index: number) => {
        setInstructions((prev) => prev.filter((_, i) => i !== index));
    }, []);

    return {
        socket: socketRef.current,
        connectionState,
        instructions,
        audioData,
        videoData,
        errors,
        isLoadingData,
        clearInstructions,
        clearAudio,
        clearVideo,
        removeInstruction,
    };
};

