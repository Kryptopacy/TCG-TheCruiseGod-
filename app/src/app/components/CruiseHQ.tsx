'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Slot Machine Randomizer
function ChatRandomizer({ activeGroupMembers, onClose, onResult }: { activeGroupMembers: string[], onClose: () => void, onResult: (res: string) => void }) {
  const [options, setOptions] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState('?');

  useEffect(() => {
    if (activeGroupMembers.length > 0) setOptions(activeGroupMembers.join(', '));
  }, [activeGroupMembers]);

  const handleSpin = () => {
    const list = options.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length < 2) return;
    setIsSpinning(true);
    let spins = 0;
    const interval = setInterval(() => {
      setCurrentDisplay(list[Math.floor(Math.random() * list.length)]);
      spins++;
      if (spins > 20) {
        clearInterval(interval);
        const winner = list[Math.floor(Math.random() * list.length)];
        setCurrentDisplay(winner);
        setTimeout(() => onResult(winner), 800);
      }
    }, 100);
  };

  return (
    <div style={{ background: 'rgba(255,150,0,0.07)', padding: '16px', borderRadius: '16px', marginBottom: '12px', border: '1px solid rgba(255,150,0,0.25)' }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#FF8C00', textAlign: 'center', fontFamily: 'var(--font-display)' }}>🎯 Room Randomizer</h4>
      <div style={{ background: 'rgba(0,0,0,0.7)', padding: '20px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ margin: 0, fontSize: isSpinning ? '2.5rem' : '1.8rem', color: isSpinning ? '#fff' : '#FFE600', transition: 'all 0.1s ease-out', textShadow: isSpinning ? '0 0 20px rgba(255,230,0,0.8)' : '0 0 10px rgba(255,150,0,0.4)' }}>
          {currentDisplay}
        </h2>
      </div>
      <input value={options} onChange={e => setOptions(e.target.value)} placeholder="Comma separated options..." style={{ width: '100%', background: 'rgba(40,8,8,0.7)', border: '1px solid rgba(255,150,0,0.2)', color: '#fff', padding: '8px', borderRadius: '8px', marginBottom: '12px', outline: 'none' }} disabled={isSpinning} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSpin} disabled={isSpinning} style={{ flex: 1, background: isSpinning ? 'rgba(255,150,0,0.3)' : 'linear-gradient(135deg, #FFE600, #FF8C00)', color: '#1a0000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 900, cursor: isSpinning ? 'default' : 'pointer', letterSpacing: '1px' }}>
          {isSpinning ? 'SPINNING...' : 'SPIN 🎰'}
        </button>
        <button onClick={onClose} disabled={isSpinning} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: isSpinning ? 'default' : 'pointer', padding: '0 12px' }}>Cancel</button>
      </div>
    </div>
  );
}

// Poll Creator
function PollCreator({ onClose, onSubmit }: { onClose: () => void, onSubmit: (q: string, opts: string[], anon: boolean) => void }) {
  const [question, setQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [anon, setAnon] = useState(false);

  const inputStyle = { width: '100%', background: 'rgba(40,8,8,0.7)', border: '1px solid rgba(255,150,0,0.2)', color: '#fff', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', outline: 'none' };

  return (
    <div style={{ background: 'rgba(255,100,0,0.07)', padding: '16px', borderRadius: '16px', marginBottom: '12px', border: '1px solid rgba(255,100,0,0.25)' }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#FF8C00', fontFamily: 'var(--font-display)' }}>📊 Create Poll</h4>
      <input placeholder="Question?" value={question} onChange={e => setQuestion(e.target.value)} style={inputStyle} />
      <input placeholder="Option 1" value={opt1} onChange={e => setOpt1(e.target.value)} style={inputStyle} />
      <input placeholder="Option 2" value={opt2} onChange={e => setOpt2(e.target.value)} style={inputStyle} />
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
        <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} /> Anonymous Voting
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => { if (question && opt1 && opt2) onSubmit(question, [opt1, opt2], anon); }} style={{ flex: 1, background: 'linear-gradient(135deg, #FF8C00, #CC1010)', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>POST POLL</button>
        <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: '0 8px' }}>Cancel</button>
      </div>
    </div>
  );
}

export interface ChatMessage {
  id: string;
  sender: string;
  text?: string;
  imageUrl?: string;
  groupId: 'main' | string;
  timestamp: number;
  highlight?: boolean;
  replyTo?: { author: string; preview: string };
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, string>;
    anonymous: boolean;
  };
}

interface CruiseHQProps {
  roomId: string;
  currentUser: string;
  groups: Record<string, string[]>;
  onSaveMemory?: (text: string, imageUrl?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const GROUP_COLORS = ['#FFE600', '#FF8C00', '#FF2A2A', '#FF6B00', '#FF4500'];

function renderWithMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.match(/^@\w+$/) ? (
      <span key={i} style={{ color: '#FFE600', fontWeight: 800, background: 'rgba(255,230,0,0.12)', padding: '1px 5px', borderRadius: '5px' }}>{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function CruiseHQ({ roomId, currentUser, groups, onSaveMemory, isOpen, onClose }: CruiseHQProps) {
  const [activeTab, setActiveTab] = useState<'main' | string>('main');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showPollUI, setShowPollUI] = useState(false);
  const [showRandomizerUI, setShowRandomizerUI] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ author: string; preview: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const myGroups = Object.entries(groups)
    .filter(([_, members]) => currentUser === 'Host' || members.includes(currentUser))
    .map(([name]) => name);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`room_${roomId}`, { config: { broadcast: { self: true } } });
    channel.on('broadcast', { event: 'room_chat' }, ({ payload }) => {
      setMessages(prev => [...prev, payload]);
    }).subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeTab]);

  const sendMessage = async (payload: Partial<ChatMessage>) => {
    if (!channelRef.current) return;
    const msg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: currentUser,
      groupId: activeTab,
      timestamp: Date.now(),
      ...payload
    };
    await channelRef.current.send({ type: 'broadcast', event: 'room_chat', payload: msg });
  };

  const handleVote = async (msgId: string, option: string) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'room_chat',
      payload: { type: 'vote', msgId, voter: currentUser, option }
    });
  };

  useEffect(() => {
    if (!channelRef.current) return;
    const sub = channelRef.current.on('broadcast', { event: 'room_chat' }, ({ payload }: any) => {
      if (payload.type === 'vote') {
        setMessages(prev => prev.map(m => {
          if (m.id === payload.msgId && m.poll) {
            return { ...m, poll: { ...m.poll, votes: { ...m.poll.votes, [payload.voter]: payload.option } } };
          }
          return m;
        }));
      }
    });
    return () => { sub.unsubscribe(); };
  }, []);

  if (!isOpen) return null;

  const currentMessages = messages.filter(m => m.groupId === activeTab);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 120,
      background: 'linear-gradient(180deg, rgba(20,3,3,0.99) 0%, rgba(14,2,2,0.99) 100%)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: 'max(16px, env(safe-area-inset-top)) 20px 0',
        background: 'linear-gradient(135deg, rgba(120,8,8,0.9) 0%, rgba(80,4,4,0.9) 100%)',
        borderBottom: '1px solid rgba(255,200,0,0.18)',
        paddingBottom: '0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px' }}>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #FFE600, #FF8C00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>🚢 CruiseHQ</h2>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.3)', color: '#FFE600', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          >
            Close ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('main')}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius-full)',
              border: activeTab === 'main' ? 'none' : '1px solid rgba(255,200,0,0.25)',
              background: activeTab === 'main' ? 'linear-gradient(135deg, #FFE600, #FF8C00)' : 'transparent',
              color: activeTab === 'main' ? '#1a0000' : 'rgba(255,200,80,0.6)',
              fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '0.82rem',
            }}
          >
            Main Room
          </button>
          {myGroups.map((groupName, i) => {
            const color = GROUP_COLORS[i % GROUP_COLORS.length];
            const isActive = activeTab === groupName;
            return (
              <button
                key={groupName}
                onClick={() => setActiveTab(groupName)}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${color}40`,
                  background: isActive ? color : 'transparent',
                  color: isActive ? '#1a0000' : color,
                  fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '0.82rem',
                }}
              >
                {groupName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {currentMessages.length === 0 && (
          <p style={{ color: 'rgba(255,200,80,0.3)', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>No messages yet. Start the vibe! 🔥</p>
        )}
        {currentMessages.map(msg => {
          const isMe = msg.sender === currentUser;
          const isTCG = msg.sender === 'TCG';

          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              {/* Sender label */}
              <div style={{
                fontSize: '0.68rem',
                color: isTCG ? '#FF8C00' : isMe ? '#FFE600' : 'rgba(255,200,80,0.5)',
                marginBottom: '4px',
                fontWeight: 900,
                textAlign: isMe ? 'right' : 'left',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {isMe ? `🚢 ${currentUser}` : isTCG ? '🔥 TCG' : msg.sender}
              </div>

              {/* Bubble */}
              <div style={{
                background: isTCG
                  ? 'rgba(140,8,8,0.25)'
                  : isMe
                    ? 'linear-gradient(135deg, #FFE600 0%, #FF8C00 100%)'
                    : 'rgba(50,8,8,0.7)',
                color: isMe ? '#1a0500' : '#fff',
                padding: '11px 15px',
                borderRadius: '18px',
                border: isTCG
                  ? '1px solid rgba(255,140,0,0.35)'
                  : isMe
                    ? 'none'
                    : '1px solid rgba(255,100,0,0.15)',
                borderBottomRightRadius: isMe ? '4px' : '18px',
                borderBottomLeftRadius: isMe ? '18px' : '4px',
                boxShadow: isMe ? '0 4px 16px rgba(255,150,0,0.3)' : '0 2px 12px rgba(0,0,0,0.3)',
              }}>
                {/* Reply quote */}
                {msg.replyTo && (
                  <div style={{
                    background: isMe ? 'rgba(0,0,0,0.12)' : 'rgba(255,150,0,0.08)',
                    borderLeft: `2px solid ${isMe ? 'rgba(0,0,0,0.3)' : '#FF8C00'}`,
                    borderRadius: '0 6px 6px 0',
                    padding: '4px 8px',
                    marginBottom: '7px',
                    fontSize: '0.75rem',
                    color: isMe ? 'rgba(0,0,0,0.55)' : 'rgba(255,200,80,0.55)',
                  }}>
                    <strong style={{ fontSize: '0.68rem' }}>↩ {msg.replyTo.author}</strong>
                    <div>{msg.replyTo.preview}</div>
                  </div>
                )}

                {msg.text && (
                  <p style={{ margin: 0, lineHeight: 1.45, fontWeight: isMe ? 700 : 400 }}>
                    {renderWithMentions(msg.text)}
                  </p>
                )}

                {/* Poll */}
                {msg.poll && (
                  <div style={{ marginTop: msg.text ? '12px' : '0' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 800 }}>📊 {msg.poll.question}</p>
                    {msg.poll.options.map(opt => {
                      const votesForOpt = Object.values(msg.poll!.votes).filter(v => v === opt).length;
                      const totalVotes = Object.keys(msg.poll!.votes).length;
                      const percent = totalVotes === 0 ? 0 : Math.round((votesForOpt / totalVotes) * 100);
                      const myVote = msg.poll!.votes[currentUser] === opt;
                      return (
                        <div
                          key={opt}
                          onClick={() => handleVote(msg.id, opt)}
                          style={{
                            background: myVote ? 'rgba(255,150,0,0.2)' : 'rgba(0,0,0,0.15)',
                            padding: '8px 12px', borderRadius: '8px', marginBottom: '7px', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
                            border: myVote ? '1px solid rgba(255,150,0,0.4)' : '1px solid transparent',
                          }}
                        >
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percent}%`, background: 'rgba(255,150,0,0.15)', zIndex: 0, transition: 'width 0.3s ease' }} />
                          <span style={{ position: 'relative', zIndex: 1, fontWeight: 700 }}>{opt} {myVote && '✓'}</span>
                          <span style={{ position: 'relative', zIndex: 1, fontSize: '0.8rem', opacity: 0.8 }}>
                            {msg.poll!.anonymous ? `${percent}%` : `${votesForOpt} (${percent}%)`}
                          </span>
                        </div>
                      );
                    })}
                    {!msg.poll.anonymous && Object.keys(msg.poll.votes).length > 0 && (
                      <p style={{ fontSize: '0.65rem', opacity: 0.5, margin: '6px 0 0 0' }}>
                        Voters: {Object.keys(msg.poll.votes).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <button
                  onClick={() => setReplyTarget({ author: msg.sender, preview: (msg.text || '').slice(0, 60) })}
                  style={{
                    background: 'none', border: '1px solid rgba(255,150,0,0.2)',
                    color: 'rgba(255,200,80,0.55)', borderRadius: '12px',
                    padding: '3px 10px', fontSize: '0.62rem', fontWeight: 700,
                    cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
                  }}
                >
                  ↩ Reply
                </button>
                {onSaveMemory && (msg.text || msg.imageUrl) && !isTCG && (
                  <button
                    onClick={() => onSaveMemory(msg.text || 'Shared Image', msg.imageUrl)}
                    style={{ background: 'none', border: 'none', color: '#FFE600', fontSize: '0.62rem', fontWeight: 800, cursor: 'pointer', minHeight: 'unset', minWidth: 'unset' }}
                  >
                    📸 SAVE
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div style={{ padding: '0 16px max(16px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', background: 'rgba(14,2,2,0.95)', borderTop: '1px solid rgba(255,150,0,0.12)' }}>
        {showPollUI && (
          <div style={{ paddingTop: '12px' }}>
            <PollCreator onClose={() => setShowPollUI(false)} onSubmit={(q, opts, anon) => { sendMessage({ poll: { question: q, options: opts, votes: {}, anonymous: anon } }); setShowPollUI(false); }} />
          </div>
        )}
        {showRandomizerUI && (
          <div style={{ paddingTop: '12px' }}>
            <ChatRandomizer
              activeGroupMembers={activeTab === 'main' ? [] : groups[activeTab] || []}
              onClose={() => setShowRandomizerUI(false)}
              onResult={(res) => { sendMessage({ text: `🎲 Randomizer chose: ${res}!`, highlight: true }); setShowRandomizerUI(false); }}
            />
          </div>
        )}

        {/* Reply preview */}
        {replyTarget && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 0 6px', borderTop: '1px solid rgba(255,150,0,0.1)', marginTop: '4px' }}>
            <div style={{ flex: 1, borderLeft: '3px solid #FF8C00', paddingLeft: '8px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FF8C00', textTransform: 'uppercase' }}>↩ Replying to {replyTarget.author}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyTarget.preview}</div>
            </div>
            <button onClick={() => setReplyTarget(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,200,80,0.5)', cursor: 'pointer', fontSize: '1rem', minHeight: 'unset', minWidth: 'unset', padding: '0 4px' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '10px', paddingBottom: '4px' }}>
          <button
            onClick={() => setShowPollUI(!showPollUI)}
            style={{ background: 'rgba(255,100,0,0.15)', color: '#FF8C00', border: '1px solid rgba(255,100,0,0.25)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', minWidth: '40px', minHeight: '40px' }}
          >📊</button>
          <button
            onClick={() => setShowRandomizerUI(!showRandomizerUI)}
            style={{ background: 'rgba(255,200,0,0.12)', color: '#FFE600', border: '1px solid rgba(255,200,0,0.2)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', minWidth: '40px', minHeight: '40px' }}
          >🎯</button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                sendMessage({ text: input, ...(replyTarget ? { replyTo: replyTarget } : {}) });
                setInput('');
                setReplyTarget(null);
              }
            }}
            placeholder={replyTarget ? `Reply to ${replyTarget.author}...` : `Message ${activeTab === 'main' ? 'Main Room' : activeTab}...`}
            style={{
              flex: 1,
              background: 'rgba(40,8,8,0.8)',
              border: '1.5px solid rgba(255,150,0,0.25)',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: '24px',
              outline: 'none',
              fontSize: '0.9rem',
            }}
          />
          <button
            onClick={() => { if (input.trim()) { sendMessage({ text: input, ...(replyTarget ? { replyTo: replyTarget } : {}) }); setInput(''); setReplyTarget(null); } }}
            style={{
              background: 'linear-gradient(135deg, #FFE600, #FF8C00)',
              color: '#1a0000',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '20px',
              fontWeight: 900,
              cursor: 'pointer',
              fontSize: '0.85rem',
              boxShadow: '0 4px 14px rgba(255,150,0,0.35)',
            }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
