'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types & Helpers ────────────────────────────────────────────────────────

type Tool = 'home' | 'coin' | 'dice' | 'bottle' | 'randomizer' | 'timer';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Sub-Tools ───────────────────────────────────────────────────────────────

// 1. Coin Flip
function CoinFlip() {
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);

  const flip = () => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);
    setTimeout(() => {
      setResult(Math.random() > 0.5 ? 'heads' : 'tails');
      setFlipping(false);
    }, 1000);
  };

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🪙 Coin Flip</h2>
      <div
        onClick={flip}
        style={{
          width: '160px', height: '160px', borderRadius: '50%',
          background: result === 'heads' ? 'radial-gradient(circle at 35% 35%, #FFE600, #b89700)' : result === 'tails' ? 'radial-gradient(circle at 35% 35%, #c0c0c0, #6b6b6b)' : 'radial-gradient(circle at 35% 35%, #FFE600, #b89700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '4rem', cursor: 'pointer', margin: '0 auto',
          boxShadow: '0 10px 40px rgba(255,230,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.3)',
          animation: flipping ? 'coin-spin 1s ease-in-out' : 'none',
          transition: 'transform 0.1s ease-in-out',
          userSelect: 'none',
        }}
        onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
        onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {flipping ? '🌀' : result === 'heads' ? '👑' : result === 'tails' ? '🦅' : '🪙'}
      </div>
      <p style={{ color: '#fff', marginTop: '20px', fontSize: '1.8rem', fontWeight: 900, minHeight: '48px', letterSpacing: '2px', textTransform: 'uppercase' }}>
        {flipping ? 'Flipping…' : result ? result : 'Tap to flip!'}
      </p>
      <button style={actionBtn} onClick={flip}>FLIP AGAIN</button>
    </div>
  );
}

// 2. Dice Roll
function DiceRoll() {
  const [values, setValues] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState(6);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setValues([]);
    setTimeout(() => {
      setValues(Array.from({ length: count }, () => randomInt(1, sides)));
      setRolling(false);
    }, 900);
  };

  const diceFaceEmoji = (n: number, s: number) => {
    if (s === 6) return ['⚀','⚁','⚂','⚃','⚄','⚅'][n - 1] ?? n;
    return n;
  };

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🎲 Dice Roll</h2>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[{ label: 'Dice', val: count, set: setCount, min: 1, max: 6 }, { label: 'Sides', val: sides, set: setSides, min: 2, max: 100 }].map(({ label, val, set, min, max }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: '0 0 8px' }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => set(v => Math.max(min, v - 1))} style={counterBtn}>−</button>
              <span style={{ color: '#FFE600', fontSize: '1.4rem', fontWeight: 900, minWidth: '32px', textAlign: 'center' }}>{val}</span>
              <button onClick={() => set(v => Math.min(max, v + 1))} style={counterBtn}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', minHeight: '80px', alignItems: 'center' }}>
        {rolling ? <span style={{ fontSize: '3rem', animation: 'spin 0.3s linear infinite' }}>🎲</span> :
          values.map((v, i) => (
            <div key={i} style={{ background: 'rgba(255,230,0,0.12)', border: '2px solid #FFE600', borderRadius: '16px', padding: '16px', fontSize: '2.5rem', lineHeight: 1, boxShadow: '0 4px 20px rgba(255,230,0,0.2)' }}>
              {diceFaceEmoji(v, sides)}
            </div>
          ))
        }
        {!rolling && values.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)' }}>Tap to roll!</p>}
      </div>
      {values.length > 1 && !rolling && (
        <p style={{ color: '#FFE600', fontWeight: 900, fontSize: '1.2rem', marginTop: '12px' }}>Total: {values.reduce((a, b) => a + b, 0)}</p>
      )}
      <button style={{ ...actionBtn, marginTop: '20px' }} onClick={roll}>ROLL THE DICE</button>
    </div>
  );
}

// 3. Spin the Bottle
function SpinBottle() {
  const [players, setPlayers] = useState<string[]>(['Alex', 'Blake', 'Casey', 'Dana']);
  const [newPlayer, setNewPlayer] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (name && !players.includes(name)) {
      setPlayers(p => [...p, name]);
      setNewPlayer('');
    }
  };

  const spin = () => {
    if (spinning || players.length < 2) return;
    setSpinning(true);
    setSelected(null);
    const extraSpins = randomInt(5, 10) * 360;
    const stopAt = randomInt(0, 360);
    const finalRotation = rotation + extraSpins + stopAt;
    setRotation(finalRotation);
    setTimeout(() => {
      const idx = Math.round((finalRotation % 360) / (360 / players.length)) % players.length;
      setSelected(players[idx]);
      setSpinning(false);
    }, 3000);
  };

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🍾 Spin the Bottle</h2>
      <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 16px', cursor: 'pointer' }} onClick={spin}>
        <svg width="200" height="200" viewBox="-100 -100 200 200">
          {players.map((p, i) => {
            const angle = (360 / players.length) * i;
            const rad = (angle - 90) * (Math.PI / 180);
            const x = 70 * Math.cos(rad);
            const y = 70 * Math.sin(rad);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="22" fill="rgba(255,230,0,0.15)" stroke="#FFE600" strokeWidth="1.5" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">{p.slice(0, 5)}</text>
              </g>
            );
          })}
          <line
            x1="0" y1="0" x2="0" y2="-65"
            stroke="#FF6B00" strokeWidth="4" strokeLinecap="round"
            transform={`rotate(${rotation})`}
            style={{ transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
          />
          <circle cx="0" cy="0" r="12" fill="#FF6B00" />
        </svg>
      </div>
      {selected && <p style={{ color: '#FFE600', fontWeight: 900, fontSize: '1.5rem', marginBottom: '12px', animation: 'slide-down-toast 0.4s' }}>👉 {selected}!</p>}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', width: '100%', maxWidth: '300px' }}>
        <input value={newPlayer} onChange={e => setNewPlayer(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} placeholder="Add player…" style={{ ...inlineInput, flex: 1 }} />
        <button onClick={addPlayer} style={counterBtn}>+</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '320px', marginBottom: '12px' }}>
        {players.map(p => (
          <span key={p} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {p}
            <button onClick={() => setPlayers(pl => pl.filter(x => x !== p))} style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', padding: '0', lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <button style={actionBtn} onClick={spin} disabled={players.length < 2 || spinning}>{spinning ? 'SPINNING…' : 'SPIN!'}</button>
    </div>
  );
}

// 4. Randomizer
function Randomizer() {
  const [items, setItems] = useState<string[]>(['Pizza', 'Tacos', 'Sushi', 'Burgers']);
  const [newItem, setNewItem] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const addItem = () => {
    const t = newItem.trim();
    if (t) { setItems(i => [...i, t]); setNewItem(''); }
  };

  const pick = () => {
    if (items.length === 0) return;
    setPicking(true);
    setResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setResult(items[randomInt(0, items.length - 1)]);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setResult(items[randomInt(0, items.length - 1)]);
        setPicking(false);
      }
    }, 80);
  };

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🎯 Randomizer</h2>
      <div style={{ background: result ? 'rgba(255,230,0,0.12)' : 'rgba(255,255,255,0.05)', border: `2px solid ${result && !picking ? '#FFE600' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', padding: '24px', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', width: '100%', maxWidth: '300px', transition: 'all 0.2s' }}>
        <p style={{ color: result ? '#FFE600' : 'rgba(255,255,255,0.4)', fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>{result ?? 'Add choices below'}</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', width: '100%', maxWidth: '300px' }}>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Add an option…" style={{ ...inlineInput, flex: 1 }} />
        <button onClick={addItem} style={counterBtn}>+</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '320px', marginBottom: '16px' }}>
        {items.map((item, i) => (
          <span key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item}
            <button onClick={() => setItems(it => it.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', padding: '0' }}>×</button>
          </span>
        ))}
      </div>
      <button style={actionBtn} onClick={pick} disabled={items.length === 0 || picking}>{picking ? 'CHOOSING…' : 'PICK ONE!'}</button>
    </div>
  );
}

// 5. Timer / Stopwatch
function TimerTool() {
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('stopwatch');
  const [isRunning, setIsRunning] = useState(false);
  const [ms, setMs] = useState(0);
  const [timerTarget, setTimerTarget] = useState(60); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const baseMs = useRef(0);

  const start = () => {
    if (isRunning) return;
    startedAtRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setMs(baseMs.current + elapsed);
    }, 50);
  };

  const pause = () => {
    if (!isRunning) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    baseMs.current = ms;
    setIsRunning(false);
  };

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setMs(0);
    baseMs.current = 0;
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const displayMs = mode === 'timer' ? Math.max(0, timerTarget * 1000 - ms) : ms;
  const isTimerDone = mode === 'timer' && displayMs <= 0 && ms > 0;

  useEffect(() => {
    if (isTimerDone) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
    }
  }, [isTimerDone]);

  const format = (totalMs: number) => {
    const s = Math.floor(totalMs / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ms100 = Math.floor((totalMs % 1000) / 10);
    if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}.${String(ms100).padStart(2,'0')}`;
  };

  const progress = mode === 'timer' ? 1 - displayMs / (timerTarget * 1000) : 0;
  const circumference = 2 * Math.PI * 80;

  return (
    <div style={toolContainer}>
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '30px', padding: '4px', marginBottom: '20px' }}>
        {(['stopwatch', 'timer'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); reset(); }} style={{ flex: 1, padding: '8px 20px', borderRadius: '26px', border: 'none', background: mode === m ? '#FFE600' : 'transparent', color: mode === m ? '#000' : '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}>{m}</button>
        ))}
      </div>
      <div style={{ position: 'relative', width: '180px', height: '180px', marginBottom: '20px' }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          {mode === 'timer' && (
            <circle cx="90" cy="90" r="80" fill="none" stroke={isTimerDone ? '#FF2A2A' : '#FFE600'} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round" transform="rotate(-90 90 90)" style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <p style={{ color: isTimerDone ? '#FF2A2A' : '#fff', fontSize: '2rem', fontWeight: 900, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{isTimerDone ? '⏰ Done!' : format(displayMs)}</p>
        </div>
      </div>
      {mode === 'timer' && !isRunning && ms === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => setTimerTarget(t => Math.max(5, t - 15))} style={counterBtn}>−15s</button>
          <span style={{ color: '#FFE600', fontWeight: 700 }}>{timerTarget}s</span>
          <button onClick={() => setTimerTarget(t => t + 15)} style={counterBtn}>+15s</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button style={{ ...actionBtn, flex: 1 }} onClick={isRunning ? pause : start}>{isRunning ? '⏸ PAUSE' : '▶ START'}</button>
        <button style={{ ...actionBtn, background: 'rgba(255,255,255,0.08)', color: '#fff', flex: 0 }} onClick={reset}>↺</button>
      </div>
    </div>
  );
}

// ─── Tool Grid Home ──────────────────────────────────────────────────────────

const toolList: { id: Tool; label: string; icon: string; color: string }[] = [
  { id: 'coin', label: 'Coin Flip', icon: '🪙', color: 'rgba(255,230,0,0.15)' },
  { id: 'dice', label: 'Dice Roll', icon: '🎲', color: 'rgba(163,255,0,0.12)' },
  { id: 'bottle', label: 'Spin the Bottle', icon: '🍾', color: 'rgba(255,107,0,0.15)' },
  { id: 'randomizer', label: 'Randomizer', icon: '🎯', color: 'rgba(0,229,255,0.12)' },
  { id: 'timer', label: 'Timer / Watch', icon: '⏱', color: 'rgba(248,0,177,0.12)' },
];

// ─── Shared Styles ────────────────────────────────────────────────────────────

const toolContainer: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '16px 8px', width: '100%', maxWidth: '380px',
};

const toolTitle: React.CSSProperties = {
  color: '#FFE600', fontSize: '1.4rem', fontWeight: 900,
  marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '2px',
};

const actionBtn: React.CSSProperties = {
  background: '#FFE600', color: '#000', border: 'none',
  borderRadius: '30px', padding: '14px 32px', fontWeight: 900,
  fontSize: '1rem', cursor: 'pointer', letterSpacing: '1px',
  boxShadow: '0 4px 20px rgba(255,230,0,0.3)',
  transition: 'transform 0.1s ease', transform: 'translateZ(0)',
};

const counterBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer',
  fontWeight: 700, fontSize: '1rem',
};

const inlineInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '12px', padding: '10px 16px', color: '#fff', fontSize: '0.9rem',
  outline: 'none',
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function ToolsPanel({ activeTool: externalTool }: { activeTool?: Tool }) {
  const [activeTool, setActiveTool] = useState<Tool>(externalTool ?? 'home');

  useEffect(() => { if (externalTool) setActiveTool(externalTool); }, [externalTool]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(13, 6, 30, 0.96)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* Top bar */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '20px 20px 0', gap: '12px', position: 'sticky', top: 0, background: 'rgba(13,6,30,0.95)', zIndex: 5 }}>
        {activeTool !== 'home' && (
          <button onClick={() => setActiveTool('home')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }}>←</button>
        )}
        <h1 style={{ flex: 1, margin: 0, color: '#FFE600', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
          {activeTool === 'home' ? '🎲 Party Tools' : toolList.find(t => t.id === activeTool)?.label ?? ''}
        </h1>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '20px' }}>
        {activeTool === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%', maxWidth: '380px' }}>
            {toolList.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                style={{
                  background: t.color, border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', padding: '24px 16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', transition: 'transform 0.15s ease',
                  aspectRatio: t.id === 'timer' ? 'auto' : '1',
                  gridColumn: t.id === 'timer' ? '1 / -1' : undefined,
                }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.94)'; }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{t.icon}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>{t.label}</span>
              </button>
            ))}
          </div>
        )}
        {activeTool === 'coin' && <CoinFlip />}
        {activeTool === 'dice' && <DiceRoll />}
        {activeTool === 'bottle' && <SpinBottle />}
        {activeTool === 'randomizer' && <Randomizer />}
        {activeTool === 'timer' && <TimerTool />}
      </div>

      <style>{`
        @keyframes coin-spin {
          0% { transform: rotateY(0deg) scale(1.05); }
          50% { transform: rotateY(900deg) scale(1.2); }
          100% { transform: rotateY(1800deg) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
