'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Mirror only what we need on the guest side
type GroupState = { members: string[]; leader: string | null };

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
  const [hasJoined, setHasJoined] = useState(false);
  const [activeGuests, setActiveGuests] = useState<string[]>([]);

  // ── Group Awareness ──
  const [groups, setGroups] = useState<Record<string, GroupState>>({});
  const [selfSelectMode, setSelfSelectMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const supabase = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(null);

  // Derived: which group is this guest in?
  const myGroup = author ? Object.entries(groups).find(([_, s]) => s.members.includes(author))?.[0] ?? null : null;
  const myGroupState = myGroup ? groups[myGroup] : null;
  const isGroupLeader = !!myGroup && myGroupState?.leader === author;
  const groupNames = Object.keys(groups);

  useEffect(() => {
    const loadIdentity = async () => {
      const savedName = localStorage.getItem('tcg_guestName');
      const { data: { user } } = await supabase.current.auth.getUser();
      if (user?.user_metadata?.display_name) {
        setAuthor(user.user_metadata.display_name);
      } else if (savedName) {
        setAuthor(savedName);
      }
    };
    loadIdentity();

    const channel = supabase.current.channel(`room:${roomId}`);
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const guests = Object.values(state).flatMap(p => p).map((p: any) => p.cruiseId as string).filter(Boolean);
      setActiveGuests(guests);
    });

    // Real-time group updates from host
    channel.on('broadcast', { event: 'group_update' }, (payload: any) => {
      const incoming: Record<string, GroupState> = payload.payload?.groups ?? {};
      setGroups(incoming);
      // Detect if self-select mode: groups exist but all are empty
      const allEmpty = Object.values(incoming).every(s => s.members.length === 0);
      setSelfSelectMode(Object.keys(incoming).length > 0 && allEmpty);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnected(false);
      }
    });

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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = author.trim() || 'Cruiser';

    if (activeGuests.includes(name)) {
      alert("This CruiseID is already active in the room! Please choose another.");
      return;
    }

    if (channelRef.current && connected) {
      await channelRef.current.track({ cruiseId: name });
      setHasJoined(true);
      localStorage.setItem('tcg_guestName', name);
    }
  };

  const handleSelfSelectGroup = async (groupName: string) => {
    if (!channelRef.current || !connected || !author) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'group_self_select',
      payload: { guest: author, requestedGroup: groupName },
    });
    // Optimistically update local state
    setSelfSelectMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !channelRef.current || !connected) return;

    setIsSending(true);
    
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
      if (base64String.length > 1500000) {
        alert("Image is too large. Try a smaller one!");
        return;
      }
      setImage(base64String);
      setActionType('chat');
    };
    reader.readAsDataURL(file);
  };

  const handleRequestCoHost = async () => {
    if (!channelRef.current || !connected) return;
    setIsRequestingCoHost(true);
    await channelRef.current.send({
      type: 'broadcast',
      event: 'cohost_request',
      payload: { cruiseId: author || 'Cruiser' }
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
          payload: { transcript, author: author || 'Co-host' }
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const GROUP_COLORS = ['#FFE600', '#FF8C00', '#FF2A2A', '#00E5FF', '#7B61FF', '#FF64C8'];

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
                width: '40px', height: '40px', borderRadius: '50%',
                background: isListening ? '#FF2A2A' : 'rgba(255,255,255,0.1)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

        {!hasJoined ? (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' }}>Set Your CruiseID</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Maverick"
              required
              style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <button type="submit" disabled={!connected} style={{ background: connected ? '#FFE600' : 'rgba(255,255,255,0.1)', color: connected ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 900, cursor: connected ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: connected ? '0 10px 30px rgba(255,230,0,0.3)' : 'none' }}>
              {connected ? 'JOIN ROOM' : 'CONNECTING...'}
            </button>
          </form>
        ) : (
          <>
            {/* ── Group Status Card ── */}
            <AnimatePresence mode="wait">
              {/* Self-select mode: show group picker */}
              {selfSelectMode && groupNames.length > 0 && !myGroup && (
                <motion.div
                  key="self-select"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    background: 'rgba(123,97,255,0.12)', border: '1.5px solid rgba(123,97,255,0.4)',
                    borderRadius: '20px', padding: '20px', textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', color: '#A78BFA', textTransform: 'uppercase', marginBottom: '8px' }}>
                    ✋ Pick Your Group
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    The host has opened group selection. Tap to join a group!
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {groupNames.map((gName, gi) => {
                      const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                      return (
                        <button
                          key={gName}
                          onClick={() => handleSelfSelectGroup(gName)}
                          style={{
                            padding: '12px 24px', borderRadius: '12px', border: `2px solid ${color}`,
                            background: `${color}15`, color, fontWeight: 900, fontSize: '1rem',
                            cursor: 'pointer', flex: 1, minWidth: '120px',
                          }}
                        >
                          {gName}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Assigned group display */}
              {myGroup && myGroupState && (
                <motion.div
                  key="my-group"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: isGroupLeader ? 'rgba(255,200,0,0.12)' : 'rgba(255,255,255,0.04)',
                    border: isGroupLeader ? '2px solid rgba(255,200,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px', padding: '20px',
                  }}
                >
                  {isGroupLeader && (
                    <div style={{
                      background: 'linear-gradient(135deg, #FFE600, #FF8C00)',
                      borderRadius: '12px', padding: '10px 16px', marginBottom: '16px', textAlign: 'center',
                    }}>
                      <p style={{ color: '#1a0000', fontWeight: 900, fontSize: '1rem', margin: 0 }}>
                        👑 YOU ARE THE GROUP LEADER
                      </p>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', margin: '0 0 4px' }}>Your Group</p>
                      <p style={{ color: '#FFE600', fontWeight: 900, fontSize: '1.4rem', margin: 0 }}>{myGroup}</p>
                    </div>
                    {myGroupState.leader && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '1px' }}>Leader</p>
                        <p style={{ color: '#FF8C00', fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>👑 {myGroupState.leader}</p>
                      </div>
                    )}
                  </div>

                  {/* Fellow members */}
                  {myGroupState.members.length > 1 && (
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Team</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {myGroupState.members.map(m => (
                          <span
                            key={m}
                            style={{
                              background: m === author ? 'rgba(255,230,0,0.15)' : 'rgba(255,255,255,0.07)',
                              border: `1px solid ${m === author ? 'rgba(255,230,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                              color: m === author ? '#FFE600' : 'rgba(255,255,255,0.7)',
                              padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem',
                              fontWeight: m === author ? 800 : 400,
                            }}
                          >
                            {m === myGroupState.leader ? '👑 ' : ''}{m}{m === author ? ' (you)' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Action Form ── */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Action Type Selector */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {(['chat', 'dare', 'truth', 'song', 'charades'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActionType(type)}
                    style={{
                      flex: 1, minWidth: '30%', padding: '12px', borderRadius: '16px', border: '2px solid',
                      borderColor: actionType === type ? '#FFE600' : 'rgba(255,255,255,0.1)',
                      background: actionType === type ? 'rgba(255,230,0,0.1)' : 'rgba(255,255,255,0.03)',
                      color: actionType === type ? '#FFE600' : 'rgba(255,255,255,0.5)',
                      fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s'
                    }}
                  >
                    {type === 'chat' ? '💬 Chat' : type === 'dare' ? '🔥 Dare' : type === 'truth' ? '🤫 Truth' : type === 'song' ? '🎵 Song' : '🎭 Charades'}
                  </button>
                ))}
              </div>

              {/* Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' }}>Playing as</label>
                  <span style={{ fontSize: '0.8rem', color: '#FFE600', fontWeight: 800 }}>{author || 'Anonymous'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {actionType === 'chat' ? 'Your Message' : actionType === 'dare' ? "What's the Dare?" : actionType === 'truth' ? "What's the Truth?" : actionType === 'song' ? 'What Song to Queue?' : 'Charades Word?'}
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={actionType === 'chat' ? 'Say something...' : actionType === 'dare' ? 'Do 10 pushups...' : actionType === 'truth' ? 'Who is your crush...' : actionType === 'song' ? 'Wizkid - Essence...' : 'Elephant...'}
                      required={!image}
                      rows={3}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '1rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ position: 'absolute', right: '12px', bottom: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📷</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                  </div>
                </div>

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
          </>
        )}

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
