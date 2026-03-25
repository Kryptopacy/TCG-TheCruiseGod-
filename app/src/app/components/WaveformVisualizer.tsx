'use client';

import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isSpeaking: boolean;
  isListening: boolean;
  color?: string;
  secondaryColor?: string;
}

export default function WaveformVisualizer({ isSpeaking, isListening, color = '#9D00FF', secondaryColor }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: { x: number; y: number; size: number; speed: number; angle: number }[] = [];

    // Initialize particles
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const time = Date.now() * 0.002;
      const centerY = canvas.height / 2;
      const step = canvas.width / 40;

      // Draw wave
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6;

      for (let i = 0; i <= 40; i++) {
        const x = i * step;
        const amplitude = isSpeaking || isListening ? (isSpeaking ? 30 : 15) : 5;
        const freq = isSpeaking ? 3 : 1.5;
        const y = centerY + Math.sin(x * 0.05 + time * freq) * amplitude * Math.sin(time * 0.5);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw secondary wave
      ctx.beginPath();
      ctx.strokeStyle = secondaryColor || color;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i <= 40; i++) {
        const x = i * step;
        const amplitude = isSpeaking || isListening ? (isSpeaking ? 20 : 10) : 3;
        const freq = isSpeaking ? 2.5 : 1.2;
        const y = centerY + Math.cos(x * 0.04 + time * freq) * amplitude * Math.cos(time * 0.4);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw particles if active
      if (isSpeaking || isListening) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        particles.forEach(p => {
          p.x += Math.cos(p.angle) * p.speed * (isSpeaking ? 3 : 1);
          p.y += Math.sin(p.angle) * p.speed * (isSpeaking ? 3 : 1);

          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isSpeaking, isListening, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={80}
      style={{
        width: '100%',
        height: '80px',
        opacity: isSpeaking || isListening ? 1 : 0.3,
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}
