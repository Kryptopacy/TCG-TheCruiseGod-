'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type VisionTask = 'bill_split' | 'drink_check' | 'game_vision' | 'general';

interface CameraCaptureProps {
  isOpen: boolean;
  task: VisionTask;
  prompt?: string;
  onClose: () => void;
  onResult: (result: string, structured?: any) => void;
}

const TASK_META: Record<VisionTask, { label: string; icon: string; hint: string; color: string }> = {
  bill_split: {
    label: 'Bill Scanner',
    icon: '💰',
    hint: 'TCG is watching — point at the receipt.',
    color: 'rgba(0, 200, 100, 0.2)',
  },
  drink_check: {
    label: 'Drink Check',
    icon: '🍶',
    hint: 'TCG is watching — point at the drink label.',
    color: 'rgba(255, 107, 0, 0.2)',
  },
  game_vision: {
    label: 'Game Vision',
    icon: '🎮',
    hint: 'TCG is watching — show the board or cards.',
    color: 'rgba(163, 255, 0, 0.2)',
  },
  general: {
    label: 'TCG Eyes',
    icon: '👁️',
    hint: 'TCG is watching. Close this to cut the feed.',
    color: 'rgba(0, 229, 255, 0.2)',
  },
};

// How often to auto-capture in continuous mode (ms)
const AUTO_CAPTURE_INTERVAL = 5000;

export default function CameraCapture({ isOpen, task, prompt, onClose, onResult }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false);

  const meta = TASK_META[task] || TASK_META.general;

  // Capture current frame from video as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isStreamReady) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [isStreamReady]);

  // Send a frame to the vision API and return result
  const analyzeFrame = useCallback(async (frameData: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameData, task, prompt }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Vision analysis failed');
      setLastResult(data.result);
      onResult(data.result, data.structured);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [task, prompt, onResult]);

  // Manual snap & analyze
  const handleSnap = useCallback(() => {
    const frame = captureFrame();
    if (frame) analyzeFrame(frame);
  }, [captureFrame, analyzeFrame]);

  // Start the live camera stream
  const startStream = useCallback(async (facing: 'user' | 'environment') => {
    setError(null);
    setIsStreamReady(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreamReady(true);
      }
    } catch {
      setError('Camera access denied or unavailable.');
    }
  }, []);

  // Stop and release
  const stopStream = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreamReady(false);
    setAutoCaptureEnabled(false);
    setLastResult(null);
  }, []);

  // Open/close stream lifecycle
  useEffect(() => {
    if (isOpen) {
      startStream(facingMode);
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isOpen, facingMode, startStream, stopStream]);

  // Auto-capture interval
  useEffect(() => {
    if (autoCaptureEnabled && isStreamReady) {
      intervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame && !isAnalyzing) analyzeFrame(frame);
      }, AUTO_CAPTURE_INTERVAL);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoCaptureEnabled, isStreamReady, captureFrame, analyzeFrame, isAnalyzing]);

  const handleClose = useCallback(() => {
    stopStream();
    setError(null);
    onClose();
  }, [stopStream, onClose]);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(5, 5, 15, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            style={{
              background: 'rgba(10, 5, 25, 0.98)',
              border: `1px solid ${isStreamReady ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '28px',
              padding: '20px',
              width: '100%',
              maxWidth: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              boxShadow: isStreamReady
                ? '0 0 60px rgba(0,229,255,0.15), 0 20px 80px rgba(0,0,0,0.8)'
                : '0 20px 80px rgba(0,0,0,0.8)',
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                  boxShadow: isStreamReady ? '0 0 14px rgba(0,229,255,0.4)' : 'none',
                  transition: 'box-shadow 0.3s ease',
                }}>
                  {meta.icon}
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', margin: 0 }}>{meta.label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: isStreamReady ? '#00ffaa' : 'rgba(255,255,255,0.25)',
                      boxShadow: isStreamReady ? '0 0 6px #00ffaa' : 'none',
                      transition: 'all 0.3s ease',
                    }} />
                    <p style={{ color: isStreamReady ? '#00ffaa' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: 0, fontWeight: 700 }}>
                      {isStreamReady ? 'LIVE' : 'Connecting…'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{ background: 'rgba(255,42,42,0.15)', border: '1px solid rgba(255,42,42,0.4)', color: '#ff7070', fontSize: '0.85rem', cursor: 'pointer', padding: '6px 12px', borderRadius: '20px', fontWeight: 800 }}
              >
                ✕ Cut Feed
              </button>
            </div>

            {/* Live Video View */}
            <div style={{
              width: '100%',
              borderRadius: '18px',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.5)',
              position: 'relative',
              aspectRatio: '4/3',
              border: isStreamReady ? '2px solid rgba(0,229,255,0.4)' : '2px solid rgba(255,255,255,0.08)',
              transition: 'border-color 0.3s ease',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Analyzing overlay */}
              {isAnalyzing && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,229,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(2px)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⚡</div>
                    <p style={{ color: '#00e5ff', fontWeight: 800, fontSize: '0.8rem', marginTop: '6px' }}>TCG is analyzing…</p>
                  </div>
                </div>
              )}

              {/* Auto-capture pulse ring */}
              {autoCaptureEnabled && isStreamReady && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: '#ff2a2a',
                  boxShadow: '0 0 0 0 rgba(255,42,42,0.6)',
                  animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite',
                }} />
              )}

              {/* Corner reticle */}
              {isStreamReady && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {/* top-left */}
                  <div style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderTop: '2px solid rgba(0,229,255,0.7)', borderLeft: '2px solid rgba(0,229,255,0.7)' }} />
                  {/* top-right */}
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderTop: '2px solid rgba(0,229,255,0.7)', borderRight: '2px solid rgba(0,229,255,0.7)' }} />
                  {/* bottom-left */}
                  <div style={{ position: 'absolute', bottom: 8, left: 8, width: 20, height: 20, borderBottom: '2px solid rgba(0,229,255,0.7)', borderLeft: '2px solid rgba(0,229,255,0.7)' }} />
                  {/* bottom-right */}
                  <div style={{ position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderBottom: '2px solid rgba(0,229,255,0.7)', borderRight: '2px solid rgba(0,229,255,0.7)' }} />
                </div>
              )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Hint */}
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
              {meta.hint}
            </p>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(255,42,42,0.1)', border: '1px solid rgba(255,42,42,0.3)',
                borderRadius: '12px', padding: '10px 14px', color: '#ff7070',
                fontSize: '0.82rem', width: '100%', textAlign: 'center',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Last result preview */}
            {lastResult && !isAnalyzing && (
              <div style={{
                background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: '14px', padding: '12px 16px', width: '100%',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 4px' }}>TCG SEES</p>
                <p style={{ color: '#e0f8ff', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>{lastResult}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              {/* Snap + Analyze */}
              <button
                onClick={handleSnap}
                disabled={!isStreamReady || isAnalyzing}
                style={{
                  flex: 2,
                  background: isStreamReady ? '#FFE600' : 'rgba(255,255,255,0.1)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '18px',
                  padding: '14px',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: isStreamReady && !isAnalyzing ? 'pointer' : 'not-allowed',
                  opacity: isStreamReady && !isAnalyzing ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.3px',
                }}
              >
                {isAnalyzing ? '⚡ Analyzing…' : '📸 Snap & Analyze'}
              </button>

              {/* Flip Camera */}
              <button
                onClick={flipCamera}
                disabled={!isStreamReady}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '18px',
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isStreamReady ? 'pointer' : 'not-allowed',
                  opacity: isStreamReady ? 1 : 0.4,
                }}
              >
                🔄 Flip
              </button>
            </div>

            {/* Auto-Capture Toggle */}
            <button
              onClick={() => setAutoCaptureEnabled(prev => !prev)}
              disabled={!isStreamReady}
              style={{
                width: '100%',
                background: autoCaptureEnabled ? 'rgba(255,42,42,0.12)' : 'rgba(255,255,255,0.05)',
                border: autoCaptureEnabled ? '1px solid rgba(255,42,42,0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: autoCaptureEnabled ? '#ff7070' : 'rgba(255,255,255,0.5)',
                borderRadius: '14px',
                padding: '10px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: isStreamReady ? 'pointer' : 'not-allowed',
                opacity: isStreamReady ? 1 : 0.4,
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease',
              }}
            >
              {autoCaptureEnabled ? '🔴 Auto-Capture ON — tap to stop' : '🔁 Enable Auto-Capture (every 5s)'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
