'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Highly scalable Visual Randomizer (Slot Machine logic)
function ChatRandomizer({ activeGroupMembers, onClose, onResult }: { activeGroupMembers: string[], onClose: () => void, onResult: (res: string) => void }) {
  const [options, setOptions] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState('?');
  
  // Auto-sync with live group members when opened
  useEffect(() => {
    if (activeGroupMembers.length > 0) {
      setOptions(activeGroupMembers.join(', '));
    }
  }, [activeGroupMembers]);

  const handleSpin = () => {
    const list = options.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length < 2) return;
    setIsSpinning(true);

    let spins = 0;
    const maxSpins = 20; // Fast 2-second visual slot machine
    const interval = setInterval(() => {
       setCurrentDisplay(list[Math.floor(Math.random() * list.length)]);
       spins++;
       if (spins > maxSpins) {
         clearInterval(interval);
         const winner = list[Math.floor(Math.random() * list.length)];
         setCurrentDisplay(winner);
         setTimeout(() => onResult(winner), 800);
       }
    }, 100);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', marginBottom: '12px', border: '1px solid rgba(0,229,255,0.3)' }}>
      <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-cyan)', textAlign: 'center' }}>🎯 Room Randomizer</h4>
      
      <div style={{ background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: isSpinning ? '2.5rem' : '1.8rem', 
          color: isSpinning ? '#fff' : 'var(--accent-cyan)',
          transition: 'all 0.1s ease-out',
          textShadow: isSpinning ? '0 0 20px rgba(255,255,255,0.8)' : '0 0 10px rgba(0,229,255,0.4)',
          transform: isSpinning ? 'scale(1.1)' : 'scale(1)'
        }}>
          {currentDisplay}
        </h2>
      </div>

      <input 
        value={options} 
        onChange={e => setOptions(e.target.value)} 
        placeholder="Comma separated options (e.g. Me, You, Sam)" 
        style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', marginBottom: '12px' }}
        disabled={isSpinning}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSpin} disabled={isSpinning} style={{ flex: 1, background: isSpinning ? 'rgba(0,229,255,0.3)' : 'var(--accent-cyan)', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 900, cursor: isSpinning ? 'default' : 'pointer', letterSpacing: '1px' }}>
          {isSpinning ? 'SPINNING...' : 'SPIN'}
        </button>
        <button onClick={onClose} disabled={isSpinning} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: isSpinning ? 'default' : 'pointer', padding: '0 12px' }}>Cancel</button>
      </div>
    </div>
  );
}

// Visual Poll Creator
function PollCreator({ onClose, onSubmit }: { onClose: () => void, onSubmit: (q: string, opts: string[], anon: boolean) => void }) {
  const [question, setQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [anon, setAnon] = useState(false);

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', marginBottom: '12px', border: '1px solid rgba(224, 64, 251, 0.3)' }}>
      <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-magenta)' }}>📊 Create Poll</h4>
      <input placeholder="Question?" value={question} onChange={e => setQuestion(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', marginBottom: '8px' }} />
      <input placeholder="Option 1" value={opt1} onChange={e => setOpt1(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', marginBottom: '8px' }} />
      <input placeholder="Option 2" value={opt2} onChange={e => setOpt2(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', marginBottom: '8px' }} />
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
        <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} />
        Anonymous Voting
      </label>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => { if(question && opt1 && opt2) onSubmit(question, [opt1, opt2], anon); }} style={{ flex: 1, background: 'var(--accent-magenta)', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>POST POLL</button>
        <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', padding: '0 8px' }}>Cancel</button>
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
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, string>; // voterName -> optionText
    anonymous: boolean;
  };
}

interface CruiseHQProps {
  roomId: string;
  currentUser: string; // "Host" or guest name
  groups: Record<string, string[]>; // e.g., { "Group 1": ["John", "Sarah"], "Group 2": ["Mike"] }
  onSaveMemory?: (text: string, imageUrl?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const GROUP_COLORS = ['#00E5FF', '#FF2A2A', '#FFE600', '#E040FB', '#00FF66'];

export default function CruiseHQ({ roomId, currentUser, groups, onSaveMemory, isOpen, onClose }: CruiseHQProps) {
  const [activeTab, setActiveTab] = useState<'main' | string>('main');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showPollUI, setShowPollUI] = useState(false);
  const [showRandomizerUI, setShowRandomizerUI] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Derive my groups
  const myGroups = Object.entries(groups)
    .filter(([_, members]) => currentUser === 'Host' || members.includes(currentUser))
    .map(([name]) => name);

  useEffect(() => {
    if (!roomId) return;
    
    const channel = supabase.channel(`room_${roomId}`, {
      config: { broadcast: { self: true } }
    });

    channel.on('broadcast', { event: 'room_chat' }, ({ payload }) => {
      setMessages(prev => [...prev, payload]);
    }).subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
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
    await channelRef.current.send({
      type: 'broadcast',
      event: 'room_chat',
      payload: msg
    });
  };

  const handleVote = async (msgId: string, option: string) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'room_chat',
      payload: { type: 'vote', msgId, voter: currentUser, option } // We handle vote updates in state
    });
  };

  // Listen for vote updates (hacky mutator for hackathon)
  useEffect(() => {
    if (!channelRef.current) return;
    const sub = channelRef.current.on('broadcast', { event: 'room_chat' }, ({ payload }: any) => {
      if (payload.type === 'vote') {
        setMessages(prev => prev.map(m => {
          if (m.id === payload.msgId && m.poll) {
            return {
              ...m,
              poll: {
                ...m.poll,
                votes: { ...m.poll.votes, [payload.voter]: payload.option }
              }
            };
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
      background: 'rgba(5, 5, 15, 0.95)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 900 }}>🚢 CruiseHQ</h2>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '16px', cursor: 'pointer', fontWeight: 700 }}>Close</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '16px 20px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setActiveTab('main')}
          style={{ 
            padding: '8px 16px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.2)',
            background: activeTab === 'main' ? '#fff' : 'transparent',
            color: activeTab === 'main' ? '#000' : '#fff',
            fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer'
          }}
        >
          Main Room
        </button>
        {myGroups.map((groupName, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          return (
            <button
              key={groupName}
              onClick={() => setActiveTab(groupName)}
              style={{ 
                padding: '8px 16px', borderRadius: 'var(--radius-full)', border: `1px solid ${color}`,
                background: activeTab === groupName ? color : 'transparent',
                color: activeTab === groupName ? '#000' : color,
                fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer'
              }}
            >
              {groupName}
            </button>
          );
        })}
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {currentMessages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '40px' }}>No messages yet. Start the vibe!</p>
        )}
        {currentMessages.map(msg => {
          const isMe = msg.sender === currentUser;
          const isTCG = msg.sender === 'TCG';

          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ fontSize: '0.7rem', color: isTCG ? 'var(--accent-magenta)' : 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 800, textAlign: isMe ? 'right' : 'left' }}>
                {isMe ? 'You' : msg.sender}
              </div>
              
              <div style={{ 
                background: isTCG ? 'rgba(224, 64, 251, 0.15)' : isMe ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                color: isMe ? '#000' : '#fff',
                padding: '12px 16px', borderRadius: '16px', border: isTCG ? '1px solid rgba(224, 64, 251, 0.5)' : 'none'
              }}>
                {msg.text && <p style={{ margin: 0, lineHeight: 1.4, fontWeight: isMe ? 600 : 400 }}>{msg.text}</p>}
                
                {msg.poll && (
                  <div style={{ marginTop: msg.text ? '12px' : '0' }}>
                    <p style={{ margin: '0 0 12px 0', fontWeight: 800 }}>📊 {msg.poll.question}</p>
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
                            background: myVote ? (isMe ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)') : 'rgba(0,0,0,0.1)', 
                            padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percent}%`, background: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', zIndex: 0, transition: 'width 0.3s ease' }} />
                          <span style={{ position: 'relative', zIndex: 1, fontWeight: 700 }}>{opt} {myVote && '✓'}</span>
                          <span style={{ position: 'relative', zIndex: 1, fontSize: '0.8rem', opacity: 0.8 }}>
                            {msg.poll!.anonymous ? `${percent}%` : `${votesForOpt} (${percent}%)`}
                          </span>
                        </div>
                      );
                    })}
                    {!msg.poll.anonymous && Object.keys(msg.poll.votes).length > 0 && (
                      <p style={{ fontSize: '0.65rem', opacity: 0.6, margin: '8px 0 0 0' }}>
                        Voters: {Object.keys(msg.poll.votes).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {onSaveMemory && (msg.text || msg.imageUrl) && !isTCG && (
                 <button 
                  onClick={() => onSaveMemory(msg.text || 'Shared Image', msg.imageUrl)}
                  style={{ display: 'block', margin: isMe ? '4px 0 0 auto' : '4px auto 0 0', background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  📸 SAVE TO MEMORIES
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column' }}>
        {showPollUI && <PollCreator onClose={() => setShowPollUI(false)} onSubmit={(q, opts, anon) => { sendMessage({ poll: { question: q, options: opts, votes: {}, anonymous: anon } }); setShowPollUI(false); }} />}
        {showRandomizerUI && <ChatRandomizer activeGroupMembers={activeTab === 'main' ? [] : groups[activeTab] || []} onClose={() => setShowRandomizerUI(false)} onResult={(res) => { sendMessage({ text: `🎲 Randomizer chose: ${res}!`, highlight: true }); setShowRandomizerUI(false); }} />}
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowPollUI(!showPollUI)} style={{ background: 'rgba(224, 64, 251, 0.2)', color: 'var(--accent-magenta)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}>📊</button>
          <button onClick={() => setShowRandomizerUI(!showRandomizerUI)} style={{ background: 'rgba(0, 229, 255, 0.2)', color: 'var(--accent-cyan)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}>🎯</button>
          
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => { if(e.key === 'Enter') { sendMessage({ text: input }); setInput(''); } }}
            placeholder={`Message ${activeTab === 'main' ? 'Main Room' : activeTab}...`}
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px 16px', borderRadius: '24px', outline: 'none' }}
          />
          <button onClick={() => { if(input.trim()){ sendMessage({ text: input }); setInput(''); } }} style={{ background: 'var(--accent-cyan)', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '24px', fontWeight: 800, cursor: 'pointer' }}>SEND</button>
        </div>
      </div>
    </div>
  );
}
