'use client';

import { useRef, useState, useEffect } from 'react';
import { AudioData, VideoData, Instruction } from '@/hooks/useWebSocketConnection';
import Timeline from './Timeline';
import TranscriptPanel from './TranscriptPanel';
import ExportButton from './ExportButton';
import EventOverlay from './EventOverlay';

interface VideoPlayerLayoutProps {
    audioData: AudioData | null;
    videoData: VideoData | null;
    instructions: Instruction[];
    sessionId: string;
    connectionState: string;
    onRemoveInstruction: (index: number) => void;
}

export default function VideoPlayerLayout({
    audioData,
    videoData,
    instructions,
    sessionId,
    connectionState,
    onRemoveInstruction
}: VideoPlayerLayoutProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
    const [syncOffset, setSyncOffset] = useState(3.60); // Default to 3.6s (User confirmed perfect)
    const [debugInfo, setDebugInfo] = useState<{
        activeType: string;
        activeTime: number;
        instructionsCount: number;
        matchedEvent: boolean;
    }>({ activeType: '', activeTime: 0, instructionsCount: 0, matchedEvent: false });

    // Trim 0 seconds from end (user requested no end trim)
    const TRIM_END = 0;

    // Initialize video and audio sources
    useEffect(() => {
        if (videoRef.current && videoData) {
            const video = videoRef.current;
            const currentSrc = video.src;
            const newSrc = videoData.url.startsWith('http') ? videoData.url : `${window.location.origin}${videoData.url}`;
            
            if (currentSrc !== newSrc) {
                console.log(`[Video Player] Switching source: ${newSrc}`);
                video.src = newSrc;
                video.load(); // Trigger reload to refresh duration/metadata
            }

            // If it's a final video, it should NOT be muted (it has the AI voice)
            if (videoData.isFinal) {
                video.muted = false;
                video.volume = volume;
                // If switching to final video, reset and stop separate audio
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = '';
                }
            } else {
                // Raw video might have background noise, optionally mute it if we have separate audio
                video.muted = !!audioData; 
            }
        }
        if (audioRef.current && audioData && !videoData?.isFinal) {
            audioRef.current.src = audioData.url;
        }
    }, [videoData, audioData, volume]);

    // Set duration when video metadata loads and apply trimming
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            const actualDuration = video.duration;
            console.log('[VideoPlayer] Metadata loaded, duration:', actualDuration, 'isFinal:', videoData?.isFinal);
            // Non-destructive: duration is full video minus end trim
            setDuration(Math.max(0, actualDuration - TRIM_END));
            // Start video at 0 (don't trim start physically)
            video.currentTime = 0;
            if (audioRef.current && !videoData?.isFinal) {
                audioRef.current.currentTime = 0;
            }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, [videoData?.url, syncOffset]); // Re-attach when URL or syncOffset changes

    // Update duration when video source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoData || isNaN(video.duration)) return;

        const newDuration = Math.max(0, video.duration - TRIM_END);
        setDuration(newDuration);
    }, [TRIM_END, videoData?.url]);

    // Sync audio to video
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        const syncAudio = () => {
            if (videoData?.isFinal) return; // Don't sync if using muxed audio

            const timeDiff = Math.abs(audio.currentTime - video.currentTime);
            if (timeDiff > 0.1) {
                audio.currentTime = video.currentTime;
            }
            if (isPlaying && audio.paused) {
                audio.play().catch(() => { });
            } else if (!isPlaying && !audio.paused) {
                audio.pause();
            }
        };

        const interval = setInterval(syncAudio, 100);
        return () => clearInterval(interval);
    }, [isPlaying, videoData?.url]);

    // Update current time and enforce trimming boundaries
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            const rawTime = video.currentTime;

            // Stop playback at the end
            if (rawTime >= video.duration - 0.1) {
                video.pause();
                if (audio) audio.pause();
                setIsPlaying(false);
                // Reset to start position
                video.currentTime = 0;
                if (audio) audio.currentTime = 0;
                setCurrentTime(0); 
                return;
            }

            // Set current time directly (non-destructive)
            setCurrentTime(rawTime);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [syncOffset, TRIM_END, videoData?.url]);

    // Calculate Zoom Transform
    useEffect(() => {
        const trimmedCurrentTimeMs = currentTime * 1000;
        const effectDuration = 800; // 0.8s matching EventOverlay

        const activeEvent = instructions.find(event => {
            const rawEventTime = Number(event.timestamp);
            
            // Normalize timestamp (handle absolute Date numbers vs relative ms)
            let absoluteOffsetMs = 0;
            if (rawEventTime < 10000000) { 
                absoluteOffsetMs = rawEventTime;
            } else {
                const startTime = instructions[0] ? Number(instructions[0].timestamp) : 0;
                absoluteOffsetMs = rawEventTime - startTime;
            }

            const adjustedEventTime = absoluteOffsetMs - (syncOffset * 1000);
            return trimmedCurrentTimeMs >= adjustedEventTime && trimmedCurrentTimeMs <= adjustedEventTime + effectDuration;
        });

        if (activeEvent && activeEvent.target?.bbox) {
            const isZoomable = activeEvent.type === 'click' || 
                              activeEvent.type === 'input' || 
                              activeEvent.type === 'type';
            
            setDebugInfo({
                activeType: activeEvent.type,
                activeTime: activeEvent.timestamp,
                instructionsCount: instructions.length,
                matchedEvent: isZoomable
            });

            if (isZoomable) {
                const { x, y, width, height } = activeEvent.target.bbox;
                const viewport = videoData?.metadata?.viewport || { width: 1920, height: 1080 };
                
                // Calculate center percentage
                const centerX = ((x + width / 2) / viewport.width) * 100;
                const centerY = ((y + height / 2) / viewport.height) * 100;

                console.log(`[Zoom] Triggered for ${activeEvent.type} at ${centerX.toFixed(1)}%, ${centerY.toFixed(1)}%`);

                setZoomStyle({
                    transform: 'scale(1.8)',
                    transformOrigin: `${centerX}% ${centerY}%`,
                    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                });
            } else {
                setZoomStyle({
                    transform: 'scale(1)',
                    transformOrigin: '50% 50%',
                    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                });
            }
        } else {
            setDebugInfo(prev => ({ ...prev, activeType: '', matchedEvent: false, instructionsCount: instructions.length }));
            setZoomStyle({
                transform: 'scale(1)',
                transformOrigin: '50% 50%',
                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            });
        }
    }, [currentTime, instructions, videoData]);

    // Play/Pause handler
    const togglePlayPause = () => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        if (isPlaying) {
            video.pause();
            audio.pause();
            setIsPlaying(false);
        } else {
            video.play().catch(() => { });
            audio.play().catch(() => { });
            setIsPlaying(true);
        }
    };

    // Seek handler
    const handleSeek = (time: number) => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        video.currentTime = time;
        if (audio) audio.currentTime = time;
        setCurrentTime(time);
    };

    // Volume handler
    const handleVolumeChange = (newVolume: number) => {
        if (videoData?.isFinal && videoRef.current) {
            videoRef.current.volume = newVolume;
        } else if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    // Toggle mute
    const toggleMute = () => {
        const target = (videoData?.isFinal && videoRef.current) ? videoRef.current : audioRef.current;
        if (target) {
            if (isMuted) {
                target.volume = volume || 0.5;
                setIsMuted(false);
            } else {
                target.volume = 0;
                setIsMuted(true);
            }
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleSeek(Math.max(0, currentTime - 5));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleSeek(Math.min(duration, currentTime + 5));
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentTime, duration, isPlaying]);

    return (
        <div className="h-screen flex flex-col bg-[var(--color-bg-primary)] overflow-hidden">
            {/* Header */}
            <header className="h-16 px-6 flex items-center justify-between bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] shrink-0">
                <div className="flex items-center gap-4">
                    {/* Logo/Title */}
                    <h1 className="text-xl font-bold gradient-text">Clueso Player</h1>

                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${connectionState === 'connected'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : 'bg-red-400'
                            } animate-pulse`} />
                        {connectionState === 'connected' ? 'Live' : 'Disconnected'}
                    </div>

                    {/* Session ID */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-tertiary)] rounded-lg">
                        <span className="text-xs text-[var(--color-text-tertiary)]">Session:</span>
                        <code className="text-xs font-mono text-[var(--color-text-secondary)]">{sessionId}</code>
                    </div>
                </div>

                {/* Export Button */}
                <ExportButton audioData={audioData} videoData={videoData} sessionId={sessionId} />
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Video Player Section */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Video Player Container (Black Background) */}
                    <div className="flex-1 relative bg-black flex items-center justify-center min-h-0 overflow-hidden rounded-xl mx-4 mt-4 shadow-2xl border border-white/5">
                        {videoData ? (
                            <div 
                                className="relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-out"
                                style={{
                                    ...zoomStyle,
                                    aspectRatio: videoData.metadata?.viewport ? `${videoData.metadata.viewport.width} / ${videoData.metadata.viewport.height}` : '16 / 9',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                }}
                            >
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    onClick={togglePlayPause}
                                />
                                {videoData.metadata && (
                                    <EventOverlay
                                        currentTime={currentTime}
                                        events={instructions}
                                        videoWidth={videoRef.current?.offsetWidth || 0}
                                        videoHeight={videoRef.current?.offsetHeight || 0}
                                        originalViewport={videoData.metadata.viewport}
                                        trimStart={syncOffset}
                                    />
                                )}
                                
                                {/* Overlay for assembly state if playing raw */}
                                {!videoData.isFinal && (
                                    <div className="absolute top-4 right-4 z-50 px-4 py-2 bg-yellow-500/90 text-black text-xs font-bold rounded-full animate-pulse shadow-lg flex items-center gap-2">
                                        <div className="w-2 h-2 bg-black rounded-full animate-ping" />
                                        Assembling AI Video...
                                    </div>
                                )}

                                {/* Debug Sync Overlay */}
                                <div className="absolute bottom-4 right-4 z-[100] px-4 py-3 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-mono text-white/70 space-y-1 pointer-events-none">
                                    <div className="flex justify-between gap-4">
                                        <span>Time (ms):</span>
                                        <span className="text-white">{(currentTime * 1000).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span>Instructions:</span>
                                        <span className="text-white">{debugInfo.instructionsCount}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span>Active Type:</span>
                                        <span className={debugInfo.matchedEvent ? "text-green-400 font-bold" : "text-white"}>
                                            {debugInfo.activeType || 'none'}
                                        </span>
                                    </div>
                                    {debugInfo.activeType && (
                                        <div className="flex justify-between gap-4">
                                            <span>Event Time:</span>
                                            <span className="text-white">{debugInfo.activeTime}</span>
                                        </div>
                                    )}
                                    <div className="pt-1 border-t border-white/10 mt-1">
                                        Viewport: {videoData.metadata?.viewport?.width || '?' }x{videoData.metadata?.viewport?.height || '?' }
                                    </div>
                                    <div className="pt-2 border-t border-white/10 mt-1 space-y-1 pointer-events-auto">
                                        <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-[var(--color-accent-primary)] font-bold">
                                            <span>Sync Offset</span>
                                            <span>{syncOffset.toFixed(2)}s</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="10" 
                                            step="0.1" 
                                            value={syncOffset}
                                            onChange={(e) => setSyncOffset(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-primary)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-6 text-center p-8">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-[var(--color-accent-primary)]/10 border-t-[var(--color-accent-primary)] rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-2 max-w-xs">
                                     <h2 className="text-xl font-semibold text-white">
                                         {instructions.length > 0 ? "Optimizing Video Playback" : "Finalizing Recording"}
                                     </h2>
                                     <p className="text-sm text-[var(--color-text-tertiary)] leading-relaxed">
                                         {instructions.length > 0 
                                             ? "AI processing is complete. We're now preparing high-quality video for your smooth experience."
                                             : "We're optimizing your video and preparing the transcript. This usually takes a few seconds."}
                                     </p>
                                 </div>
                            </div>
                        )}
                    </div>

                    {/* Hidden Audio Element */}
                    <audio ref={audioRef} />

                    {/* Timeline */}
                    <Timeline
                        currentTime={currentTime}
                        duration={duration}
                        events={instructions}
                        onSeek={handleSeek}
                        isPlaying={isPlaying}
                        syncOffset={syncOffset}
                        onRemoveEvent={onRemoveInstruction}
                    />
                </div>

                {/* Transcript Panel */}
                <div className="w-96 shrink-0">
                    <TranscriptPanel
                        audioData={audioData}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        onRemoveEvent={onRemoveInstruction}
                        instructions={instructions}
                        connectionState={connectionState}
                    />
                </div>
            </div>
        </div>
    );
}
