'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function GuestRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const roomId = id.toUpperCase();
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'chat' | 'dare' | 'truth' | 'song' | 'charades'>('chat');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isRequestingCoHost, setIsRequestingCoHost] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const supabase = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(null);

  useEffect(() => {
    // Attempt to recover saved author name
    const savedName = localStorage.getItem('tcg_guestName');
    if (savedName) setAuthor(savedName);

    // Initialize Supabase specific room channel
    const channel = supabase.current.channel(`room:${roomId}`);
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Connected to room:${roomId}`);
        setConnected(true);
        // Track presence immediately
        await channel.track({ cruiseId: savedName || 'Cruiser' });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnected(false);
      }
    });

    // Listen for co-host approval
    channel.on('broadcast', { event: 'cohost_approved' }, (payload) => {
      if (payload.payload.cruiseId === (localStorage.getItem('tcg_guestName') || 'Cruiser')) {
        setIsCoHost(true);
        setIsRequestingCoHost(false);
        alert("You are now a Co-host! Use the Mic to speak to TCG.");
      }
    });

    return () => {
      supabase.current.removeChannel(channel);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !channelRef.current || !connected) return;

    setIsSending(true);
    
    // Save author name locally for future submissions
    if (author.trim()) {
      localStorage.setItem('tcg_guestName', author.trim());
    }

    try {
      const response = await channelRef.current.send({
        type: 'broadcast',
        event: 'guest_action',
        payload: {
          type: actionType,
          content: content.trim(),
          image: image,
          author: author.trim() || 'Anonymous'
        }
      });

      if (response === 'ok') {
        setSentSuccess(true);
        setContent('');
        setImage(null);
        setTimeout(() => setSentSuccess(false), 3000);
      } else {
        alert("Failed to send to host. Try again.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Truncate if too large for broadcast (max 2MB roughly, but let's be safe at 1MB)
      if (base64String.length > 1500000) {
        alert("Image is too large. Try a smaller one!");
        return;
      }
      setImage(base64String);
      setActionType('chat'); // Default to chat when an image is picked
    };
    reader.readAsDataURL(file);
  };

  const handleRequestCoHost = async () => {
    if (!channelRef.current || !connected) return;
    setIsRequestingCoHost(true);
    await channelRef.current.send({
      type: 'broadcast',
      event: 'cohost_request',
      payload: {
        cruiseId: author || 'Cruiser'
      }
    });
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'cohost_voice',
          payload: {
            transcript,
            author: author || 'Co-host'
          }
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <img src="/TCG.png" alt="TCG Logo" style={{ width: '80px', height: 'auto' }} />
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isCoHost && (
            <button
              onClick={toggleMic}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isListening ? '#FF2A2A' : 'rgba(255,255,255,0.1)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                animation: isListening ? 'pulse-red 1.5s infinite' : 'none',
                boxShadow: isListening ? '0 0 15px #FF2A2A' : 'none'
              }}
            >
              🎙️
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#00E5FF' : '#FF2A2A', boxShadow: connected ? '0 0 10px #00E5FF' : 'none' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>CruiseHQ: {roomId}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px', background: 'var(--gradient-magenta, linear-gradient(135deg, #e040fb 0%, #00e5ff 100%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            You're In!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            You are sending commands directly to the host's screen. Pick an action below.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Action Type Selector */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {(['chat', 'dare', 'truth', 'song', 'charades'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActionType(type)}
                style={{
                  flex: 1,
                  minWidth: '30%',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '2px solid',
                  borderColor: actionType === type ? '#FFE600' : 'rgba(255,255,255,0.1)',
                  background: actionType === type ? 'rgba(255,230,0,0.1)' : 'rgba(255,255,255,0.03)',
                  color: actionType === type ? '#FFE600' : 'rgba(255,255,255,0.5)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {type === 'chat' ? '💬 Chat' : type === 'dare' ? '🔥 Dare' : type === 'truth' ? '🤫 Truth' : type === 'song' ? '🎵 Song' : '🎭 Charades'}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' }}>Cruise ID (Your Name)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onBlur={() => {
                  if (connected && channelRef.current) {
                     channelRef.current.track({ cruiseId: author || 'Cruiser' });
                  }
                }}
                placeholder="Stay Anonymous, or type a name..."
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '1rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
                {actionType === 'chat' ? 'Your Message' : actionType === 'dare' ? 'What\'s the Dare?' : actionType === 'truth' ? 'What\'s the Truth?' : actionType === 'song' ? 'What Song to Queue?' : 'Charades Word?'}
              </label>
              
              <div style={{ position: 'relative' }}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={actionType === 'chat' ? 'Say something...' : actionType === 'dare' ? 'Do 10 pushups...' : actionType === 'truth' ? 'Who is your crush...' : actionType === 'song' ? 'Wizkid - Essence...' : 'Elephant...'}
                  required={!image}
                  rows={3}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
                
                {/* Image Picker Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'absolute', right: '12px', bottom: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>📷</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>

            {/* Image Preview */}
            <AnimatePresence>
              {image && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #FFE600', maxWidth: '200px' }}
                >
                  <img src={image} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {sentSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ background: 'var(--accent-green, #00C853)', color: '#000', padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}
                >
                  ✓ SENT TO HOST
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <motion.button
                    type="submit"
                    disabled={(!content.trim() && !image) || isSending || !connected}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: connected ? '#FFE600' : 'rgba(255,255,255,0.1)', color: connected ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', padding: '18px', borderRadius: '12px', fontWeight: 900, fontSize: '1.1rem', cursor: connected ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: connected ? '0 10px 30px rgba(255,230,0,0.3)' : 'none' }}
                  >
                    {isSending ? 'SENDING...' : connected ? 'BLAST TO HOST 🚀' : 'CONNECTING...'}
                  </motion.button>

                  {!isCoHost && (
                    <button
                      type="button"
                      onClick={handleRequestCoHost}
                      disabled={isRequestingCoHost}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isRequestingCoHost ? 'WAITING FOR APPROVAL...' : '🎙️ REQUEST CO-HOST (REMOTE MIC)'}
                    </button>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </form>

        <style jsx global>{`
          @keyframes pulse-red {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 42, 42, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 42, 42, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 42, 42, 0); }
          }
        `}</style>
      </div>
    </div>
  );
}
