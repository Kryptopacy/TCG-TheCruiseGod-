'use client';

import React, { useState, useRef, useCallback } from 'react';
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
    hint: 'Point at the receipt — TCG will read the total and split it.',
    color: 'rgba(0, 200, 100, 0.2)',
  },
  drink_check: {
    label: 'Drink Check',
    icon: '🍶',
    hint: 'Point at the drink or bottle label — TCG will verify it.',
    color: 'rgba(255, 107, 0, 0.2)',
  },
  game_vision: {
    label: 'Game Vision',
    icon: '🎮',
    hint: 'Snap the board or cards — TCG will assess the game state.',
    color: 'rgba(163, 255, 0, 0.2)',
  },
  general: {
    label: 'Vision',
    icon: '👁️',
    hint: 'Point at anything — TCG will analyze it for you.',
    color: 'rgba(0, 229, 255, 0.2)',
  },
};

export default function CameraCapture({ isOpen, task, prompt, onClose, onResult }: CameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const meta = TASK_META[task] || TASK_META.general;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!preview) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview, task, prompt }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Vision analysis failed');
      }

      onResult(data.result, data.structured);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [preview, task, prompt, onResult]);

  const handleClose = useCallback(() => {
    setPreview(null);
    setError(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }, [onClose]);

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
            padding: '24px',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            style={{
              background: 'rgba(20, 12, 40, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '28px',
              padding: '32px 24px',
              width: '100%',
              maxWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 20px 80px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: meta.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                  }}
                >
                  {meta.icon}
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem', margin: 0 }}>{meta.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>Powered by Gemini Vision</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.4rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Hint */}
            {!preview && (
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                {meta.hint}
              </p>
            )}

            {/* Preview */}
            {preview && (
              <div
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.12)',
                  background: 'rgba(0,0,0,0.3)',
                  maxHeight: '280px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={preview}
                  alt="Preview"
                  style={{ width: '100%', height: 'auto', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  background: 'rgba(255, 42, 42, 0.1)',
                  border: '1px solid rgba(255, 42, 42, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#ff7070',
                  fontSize: '0.85rem',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Hidden file input — camera on mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="camera-capture-input"
            />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              {!preview ? (
                <>
                  {/* Primary: Camera */}
                  <label
                    htmlFor="camera-capture-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      background: '#FFE600',
                      color: '#000',
                      borderRadius: '20px',
                      padding: '16px',
                      fontWeight: 900,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 20px rgba(255,230,0,0.3)',
                      transition: 'transform 0.1s ease',
                    }}
                    onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    📸 Take Photo
                  </label>

                  {/* Secondary: Upload from gallery */}
                  <label
                    htmlFor="camera-capture-input"
                    onClick={() => {
                      // Remove capture attribute for gallery selection
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      borderRadius: '20px',
                      padding: '14px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    🖼️ Choose from Gallery
                  </label>
                </>
              ) : (
                <>
                  {/* Analyze */}
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      background: isAnalyzing ? 'rgba(255,230,0,0.5)' : '#FFE600',
                      color: '#000',
                      borderRadius: '20px',
                      padding: '16px',
                      fontWeight: 900,
                      fontSize: '1rem',
                      cursor: isAnalyzing ? 'wait' : 'pointer',
                      border: 'none',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 20px rgba(255,230,0,0.3)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isAnalyzing ? (
                      <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</span>
                        Analyzing…
                      </>
                    ) : (
                      `🔍 Analyze with TCG Vision`
                    )}
                  </button>

                  {/* Retake */}
                  <button
                    onClick={() => {
                      setPreview(null);
                      setError(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.setAttribute('capture', 'environment');
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)',
                      borderRadius: '20px',
                      padding: '13px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    ↩ Retake Photo
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
