'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioData, Instruction } from '@/hooks/useWebSocketConnection';

interface TranscriptPanelProps {
    audioData: AudioData | null;
    currentTime: number;
    duration?: number;
    onSeek?: (time: number) => void;
    instructions?: Instruction[];
    onRemoveEvent?: (index: number) => void;
    connectionState?: string;
}

interface TranscriptSegment {
    type: 'text' | 'interaction';
    text: string;
    startTime: number;
    endTime: number;
    index?: number; // Original index for removal
    interactionType?: string;
}

export default function TranscriptPanel({ audioData, currentTime, duration, onSeek, instructions = [], onRemoveEvent, connectionState }: TranscriptPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [combinedSegments, setCombinedSegments] = useState<TranscriptSegment[]>([]);

    // Interleave transcript and instructions
    useEffect(() => {
        const totalDuration = duration || 60;
        const allSegments: TranscriptSegment[] = [];

        // 1. Add Text Segments
        if (audioData?.text) {
            const sentences = audioData.text.match(/[^.!?]+[.!?]+/g) || [audioData.text];
            const segmentDuration = totalDuration / sentences.length;
            
            sentences.forEach((sentence, idx) => {
                allSegments.push({
                    type: 'text',
                    text: sentence.trim(),
                    startTime: idx * segmentDuration,
                    endTime: (idx + 1) * segmentDuration,
                });
            });
        }

        // 2. Add Interaction Segments
        instructions.forEach((event, idx) => {
            // Check if timestamp is likely a relative offset (small number) or absolute Date string
            let absoluteTime = 0;
            const rawTimestamp = Number(event.timestamp);
            
            if (rawTimestamp < 10000000) { 
                absoluteTime = rawTimestamp / 1000;
            } else {
                const startTime = instructions[0] ? Number(instructions[0].timestamp) : 0;
                absoluteTime = (rawTimestamp - startTime) / 1000;
            }

            allSegments.push({
                type: 'interaction',
                text: `${event.type === 'click' ? 'Clicked' : event.type === 'type' ? 'Typed into' : 'Interacted with'} ${event.target?.text || event.target?.tag || 'element'}`,
                startTime: absoluteTime,
                endTime: absoluteTime + 1, // Visual duration for highlighting
                index: idx,
                interactionType: event.type
            });
        });

        // 3. Sort by startTime
        setCombinedSegments(allSegments.sort((a, b) => a.startTime - b.startTime));
    }, [audioData, duration, instructions]);

    // Auto-scroll to current segment
    useEffect(() => {
        const currentSegmentIndex = combinedSegments.findIndex(
            seg => currentTime >= seg.startTime && currentTime < seg.endTime
        );

        if (currentSegmentIndex !== -1 && containerRef.current) {
            const segmentElement = containerRef.current.querySelector(
                `[data-segment-index="${currentSegmentIndex}"]`
            );
            segmentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentTime, combinedSegments]);

    // Filter segments by search query
    const filteredSegments = combinedSegments.filter(seg =>
        seg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSegmentClick = (startTime: number) => {
        if (onSeek) onSeek(startTime);
    };

    return (
        <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] border-l border-[var(--color-border-primary)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border-primary)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--color-accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Guide Feed
                </h3>

                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search text or actions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 pl-10 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {combinedSegments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                        <div className="w-16 h-16 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium">Listening for interactions...</p>
                        <p className="text-xs mt-1">Transcript and actions will appear as they process.</p>
                    </div>
                ) : (
                    filteredSegments.map((segment, idx) => {
                        const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
                        
                        return (
                            <div
                                key={idx}
                                data-segment-index={idx}
                                onClick={() => handleSegmentClick(segment.startTime)}
                                className={`
                                    group relative p-3 rounded-xl transition-all duration-200 cursor-pointer
                                    ${isActive 
                                        ? 'bg-[var(--color-accent-primary)]/10 ring-1 ring-[var(--color-accent-primary)]/30' 
                                        : 'hover:bg-[var(--color-bg-tertiary)]'
                                    }
                                    ${segment.type === 'interaction' ? 'border-l-2 border-yellow-500/50 pl-4' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        {segment.type === 'interaction' && (
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-500/80">Interaction</span>
                                            </div>
                                        )}
                                        <p className={`text-sm leading-relaxed ${isActive ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                                            {segment.text}
                                        </p>
                                    </div>

                                    {segment.type === 'interaction' && onRemoveEvent && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveEvent(segment.index!);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                            title="Remove this action"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-6 py-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-tertiary)]">
                <div className="flex gap-4">
                    <span>{instructions.length} Actions</span>
                    <span>{audioData?.text?.split(' ').length || 0} Words</span>
                </div>
                {connectionState === 'connected' && (
                    <div className="flex items-center gap-1.5 text-green-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live
                    </div>
                )}
            </div>
        </div>
    );
}
