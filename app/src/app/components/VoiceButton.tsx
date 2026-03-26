'use client';

import React, { useEffect, useRef } from 'react';

interface VoiceButtonProps {
  status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing';
  onClick: () => void;
  disabled?: boolean;
  isMuted?: boolean;
}

export default function VoiceButton({ status, onClick, disabled, isMuted }: VoiceButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2); // Retina

    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      // Outer glow rings
      if (status === 'listening' || status === 'speaking') {
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
          const phase = (time * 0.02 + i * 0.33) % 1;
          const radius = 50 + phase * 40;
          const alpha = (1 - phase) * 0.3;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = status === 'speaking'
            ? `rgba(224, 64, 251, ${alpha})`
            : `rgba(0, 229, 255, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Main button circle
      const gradient = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy, 48);
      if (isMuted) {
        gradient.addColorStop(0, 'rgba(204, 16, 16, 0.4)');
        gradient.addColorStop(1, 'rgba(204, 16, 16, 0.15)');
      } else if (status === 'idle' || status === 'connecting') {
        gradient.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 229, 255, 0.05)');
      } else if (status === 'listening') {
        gradient.addColorStop(0, 'rgba(0, 229, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 229, 255, 0.1)');
      } else if (status === 'speaking') {
        gradient.addColorStop(0, 'rgba(224, 64, 251, 0.3)');
        gradient.addColorStop(1, 'rgba(224, 64, 251, 0.1)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 215, 64, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 215, 64, 0.05)');
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 48, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = isMuted 
        ? 'rgba(204, 16, 16, 0.7)'
        : status === 'speaking'
          ? 'rgba(224, 64, 251, 0.6)'
          : status === 'listening'
            ? 'rgba(0, 229, 255, 0.6)'
            : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner icon — mic or waveform
      if (isMuted) {
        // Muted Mic icon (mic with a slash)
        ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.beginPath();
        ctx.roundRect(cx - 5, cy - 14, 10, 20, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 12, 0, Math.PI);
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Slash
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - 16);
        ctx.lineTo(cx + 14, cy + 16);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (status === 'speaking') {
        // Equalizer bars
        const bars = 5;
        const barWidth = 4;
        const gap = 3;
        const totalWidth = bars * barWidth + (bars - 1) * gap;
        const startX = cx - totalWidth / 2;
        for (let i = 0; i < bars; i++) {
          const h = 8 + Math.sin(time * 0.08 + i * 1.2) * 12;
          const x = startX + i * (barWidth + gap);
          const y = cy - h / 2;
          ctx.fillStyle = 'rgba(224, 64, 251, 0.9)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, h, 2);
          ctx.fill();
        }
      } else if (status === 'listening') {
        // Pulsing dot
        const dotSize = 6 + Math.sin(time * 0.06) * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
        ctx.fill();
      } else if (status === 'processing' || status === 'connecting') {
        // Spinning dots
        const dotCount = 3;
        for (let i = 0; i < dotCount; i++) {
          const angle = (time * 0.04) + (i * Math.PI * 2 / dotCount);
          const dx = cx + Math.cos(angle) * 14;
          const dy = cy + Math.sin(angle) * 14;
          ctx.beginPath();
          ctx.arc(dx, dy, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 215, 64, ${0.5 + i * 0.2})`;
          ctx.fill();
        }
      } else {
        // Mic icon (simplified)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        // Mic body
        ctx.beginPath();
        ctx.roundRect(cx - 5, cy - 14, 10, 20, 5);
        ctx.fill();
        // Mic arc
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 12, 0, Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Mic stand
        ctx.beginPath();
        ctx.moveTo(cx, cy + 14);
        ctx.lineTo(cx, cy + 20);
        ctx.stroke();
      }

      time++;
      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status, isMuted]);

  const statusLabels: Record<string, string> = {
    idle: 'Tap to talk',
    connecting: 'Connecting...',
    listening: 'Listening...',
    speaking: 'TCG is talking',
    processing: 'Thinking...',
  };

  const currentLabel = isMuted ? 'Muted (Tap to unmute)' : statusLabels[status];

  return (
    <div className="voice-button-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
    }}>
      <button
        onClick={onClick}
        disabled={disabled && !isMuted} // allow clicking if muted to unmute!
        aria-label={currentLabel}
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: (disabled && !isMuted) ? 'not-allowed' : 'pointer',
          position: 'relative',
          padding: 0,
          opacity: (disabled && !isMuted) ? 0.5 : 1,
          transition: 'opacity 0.2s, transform 0.15s',
          transform: 'scale(1)',
        }}
        onMouseDown={(e) => {
          if (!(disabled && !isMuted)) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </button>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: isMuted ? 'var(--accent-red, #ff4444)'
          : status === 'listening' ? 'var(--accent-cyan)'
          : status === 'speaking' ? 'var(--accent-magenta)'
            : 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        transition: 'color 0.3s',
      }}>
        {currentLabel}
      </span>
    </div>
  );
}
