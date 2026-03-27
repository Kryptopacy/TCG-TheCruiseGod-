'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types & Helpers ────────────────────────────────────────────────────────

type Tool = 'home' | 'coin' | 'dice' | 'bottle' | 'randomizer' | 'timer' | 'bill' | 'truth' | 'scoreboard' | 'charades';

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
function SpinBottle({ activeGuests = [] }: { activeGuests?: string[] }) {
  const defaultPlayers = activeGuests.length >= 2 ? activeGuests.slice(0, 8) : ['Alex', 'Blake', 'Casey', 'Dana'];
  const [players, setPlayers] = useState<string[]>(defaultPlayers);

  // Sync when guests join the room after mount (cap at 8)
  useEffect(() => {
    if (activeGuests.length >= 2) setPlayers(activeGuests.slice(0, 8));
  }, [activeGuests.join(',')]);
  const [newPlayer, setNewPlayer] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (name && !players.includes(name)) {
      if (players.length >= 8) {
        alert('Max 8 players for Spin the Bottle! Use the Randomizer for larger groups.');
        return;
      }
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
      {activeGuests.length > 8 && (
        <p style={{ color: '#FF2A2A', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', margin: '0 0 16px', background: 'rgba(255,42,42,0.1)', padding: '8px 12px', borderRadius: '12px' }}>
          ⚠️ Room too large for bottle spin. Only first 8 guests added. Use Randomizer instead!
        </p>
      )}
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
      {activeGuests.length >= 2 && (
        <button
          onClick={() => setPlayers(activeGuests.slice(0, 8))}
          style={{ ...actionBtn, background: 'rgba(0,229,255,0.15)', color: 'var(--accent-cyan, #00e5ff)', border: '1px solid rgba(0,229,255,0.4)', boxShadow: 'none', padding: '10px 20px', fontSize: '0.8rem', marginBottom: '12px' }}
        >
          👥 RELOAD FROM ROOM (MAX 8)
        </button>
      )}
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
function Randomizer({ activeGuests = [], groups = {} }: { activeGuests?: string[]; groups?: Record<string, string[]> }) {
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
      <div style={{ background: result || picking ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.05)', border: `2px solid ${result && !picking ? '#FFE600' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', padding: '24px', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', width: '100%', maxWidth: '300px', transition: 'all 0.2s', overflow: 'hidden' }}>
        <p style={{ 
          color: result && !picking ? '#FFE600' : picking ? '#fff' : 'rgba(255,255,255,0.4)', 
          fontSize: picking ? '2.5rem' : result ? '1.8rem' : '1.2rem', 
          fontWeight: 900, 
          margin: 0,
          transition: 'all 0.1s ease-out',
          textShadow: picking ? '0 0 20px rgba(255,255,255,0.8)' : result ? '0 0 15px rgba(255,230,0,0.4)' : 'none',
          transform: picking ? 'scale(1.1)' : 'scale(1)',
          textAlign: 'center'
        }}>
          {result ?? 'Add choices below'}
        </p>
      </div>
      {(activeGuests.length > 0 || Object.keys(groups).length > 0) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '300px' }}>
          {activeGuests.length > 0 && (
            <button
              onClick={() => setItems([...activeGuests])}
              style={{ flex: 1, background: 'rgba(0,229,255,0.12)', color: 'var(--accent-cyan, #00e5ff)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '12px', padding: '8px 12px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              👥 ALL Room Members
            </button>
          )}
          {Object.keys(groups).length > 0 && (
            <button
              onClick={() => setItems(Object.keys(groups))}
              style={{ flex: 1, background: 'rgba(224,64,251,0.12)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.3)', borderRadius: '12px', padding: '8px 12px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              🎲 ALL Group Names
            </button>
          )}
        </div>
      )}
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

// 6. Bill Splitter
function BillSplitter({ location = '' }: { location?: string }) {
  const [total, setTotal] = useState('');
  const [tip, setTip] = useState(15);
  const [people, setPeople] = useState(2);
  const [currency, setCurrency] = useState('₦');

  // Auto-detect currency from location
  useEffect(() => {
    if (!location) return;
    const loc = location.toLowerCase();
    
    const currencyMap: Array<{ match: string[], sym: string }> = [
      { match: ['nigeria', 'lagos', 'abuja', 'ph'], sym: '₦' },
      { match: ['us', 'usa', 'united states', 'york', 'california', 'texas', 'florida'], sym: '$' },
      { match: ['uk', 'united kingdom', 'london', 'england', 'scotland'], sym: '£' },
      { match: ['france', 'germany', 'spain', 'italy', 'netherlands', 'europe'], sym: '€' },
      { match: ['uae', 'dubai', 'emirates'], sym: 'د.إ' },
      { match: ['canada', 'toronto', 'vancouver'], sym: 'C$' },
      { match: ['australia', 'sydney', 'melbourne'], sym: 'A$' },
      { match: ['ghana', 'accra'], sym: 'GH₵' },
      { match: ['kenya', 'nairobi'], sym: 'KSh' },
      { match: ['south africa', 'cape town', 'johannesburg'], sym: 'R' },
      { match: ['india', 'mumbai', 'delhi'], sym: '₹' },
      { match: ['japan', 'tokyo'], sym: '¥' },
    ];

    const match = currencyMap.find(c => c.match.some(m => loc.includes(m)));
    if (match) setCurrency(match.sym);
  }, [location]);

  const bill = parseFloat(total) || 0;
  const tipAmt = bill * (tip / 100);
  const grandTotal = bill + tipAmt;
  const perPerson = people > 0 ? grandTotal / people : 0;

  // Format nicely — no decimals if whole number
  const fmt = (n: number) => n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>💰 Bill Splitter</h2>
      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Editable Currency Input + Quick Presets */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '12px 16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', flex: 1 }}>CURRENCY</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['₦', '$', '£', '€'].map(sym => (
              <button
                key={sym}
                onClick={() => setCurrency(sym)}
                style={{ padding: '4px 10px', borderRadius: '10px', border: 'none', background: currency === sym ? '#FFE600' : 'rgba(255,255,255,0.08)', color: currency === sym ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
              >{sym}</button>
            ))}
          </div>
          <input 
            value={currency}
            onChange={(e) => setCurrency(e.target.value.substring(0, 4))}
            placeholder="SYM"
            style={{ width: '50px', background: 'rgba(255,230,0,0.1)', border: '1px solid rgba(255,230,0,0.4)', borderRadius: '8px', padding: '6px', color: '#FFE600', fontSize: '1rem', fontWeight: 900, textAlign: 'center', outline: 'none' }}
          />
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', display: 'block', marginBottom: '8px' }}>TOTAL BILL</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#FFE600', fontWeight: 900, fontSize: '1.4rem' }}>{currency}</span>
            <input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="0.00" inputMode="decimal" style={{ ...inlineInput, flex: 1, fontSize: '1.6rem', fontWeight: 900, background: 'transparent', border: 'none', padding: '0' }} />
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', display: 'block', marginBottom: '12px' }}>TIP: {tip}%</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[0, 10, 15, 18, 20, 25].map(t => (
              <button key={t} onClick={() => setTip(t)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: tip === t ? '#FFE600' : 'rgba(255,255,255,0.1)', color: tip === t ? '#000' : '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>{t}%</button>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', display: 'block', marginBottom: '8px' }}>SPLIT BETWEEN</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setPeople(p => Math.max(1, p - 1))} style={counterBtn}>−</button>
            <span style={{ color: '#FFE600', fontSize: '1.6rem', fontWeight: 900, flex: 1, textAlign: 'center' }}>{people} {people === 1 ? 'person' : 'people'}</span>
            <button onClick={() => setPeople(p => p + 1)} style={counterBtn}>+</button>
          </div>
        </div>
        <div style={{ background: 'rgba(255,230,0,0.12)', border: '2px solid #FFE600', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: '0 0 4px' }}>EACH PERSON PAYS</p>
          <p style={{ color: '#FFE600', fontSize: '2.8rem', fontWeight: 900, margin: '0 0 8px' }}>{currency}{fmt(perPerson)}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Total {currency}{fmt(grandTotal)} · Tip {currency}{fmt(tipAmt)}</p>
        </div>
      </div>
    </div>
  );
}

const truths = {
  mild: [
    "What's the most embarrassing thing you've done in public?",
    "Have you ever pretended to like someone's food?",
    "What's your most cringe-worthy text you've ever sent?",
    "Have you ever faked being sick to get out of plans?"
  ],
  spicy: [
    "Who in this room would you call at 3am?",
    "What's the worst lie you've ever told?",
    "Who was your most unexpected crush?",
    "What's the pettiest thing you've ever done?"
  ],
  savage: [
    "What's a secret you've never told anyone here?",
    "What's something you'd be mortified if your parents found out?",
    "Who in this room do you think has the worst taste in partners?",
    "What's the biggest mistake you've ever made in a relationship?"
  ]
};

const dares = {
  mild: [
    "Do your best impression of someone in this room.",
    "Do 20 push-ups or sing a chorus of any song.",
    "Talk in an accent for the next 3 rounds.",
    "Do your best runway walk across the room."
  ],
  spicy: [
    "Let someone post anything they want on your story for 10 seconds.",
    "Show your camera roll to the group (last 5 photos).",
    "Speak only in questions for the next 2 minutes.",
    "Let the group change your name in your phone to anything they want."
  ],
  savage: [
    "Text your most recent contact a heart emoji right now.",
    "Call a friend and say 'I have something important to tell you' then hang up.",
    "Let the person to your left go through your DMs for 30 seconds.",
    "Eat a spoonful of whatever condiment the group chooses."
  ]
};

function TruthOrDare() {
  const [mode, setMode] = useState<'truth' | 'dare' | null>(null);
  const [text, setText] = useState('');
  const [intensity, setIntensity] = useState<'mild' | 'spicy' | 'savage'>('mild');

  const pick = (type: 'truth' | 'dare') => {
    setMode(type);
    const pool = type === 'truth' ? truths[intensity] : dares[intensity];
    setText(pool[randomInt(0, pool.length - 1)]);
  };

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🃏 Truth or Dare</h2>
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '30px', padding: '4px', marginBottom: '20px', width: '100%', maxWidth: '300px' }}>
        {(['mild', 'spicy', 'savage'] as const).map(i => (
          <button key={i} onClick={() => setIntensity(i)} style={{ flex: 1, padding: '8px', borderRadius: '26px', border: 'none', background: intensity === i ? (i === 'savage' ? '#FF2A2A' : i === 'spicy' ? '#FF6B00' : '#FFE600') : 'transparent', color: intensity === i ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}>{i}</button>
        ))}
      </div>
      {text ? (
        <div style={{ background: mode === 'truth' ? 'rgba(0,229,255,0.1)' : 'rgba(255,107,0,0.1)', border: `2px solid ${mode === 'truth' ? 'rgba(0,229,255,0.5)' : 'rgba(255,107,0,0.5)'}`, borderRadius: '20px', padding: '24px', marginBottom: '20px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
          <p style={{ color: mode === 'truth' ? 'var(--accent-cyan)' : '#FF6B00', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '3px', marginBottom: '12px' }}>{mode?.toUpperCase()}</p>
          <p style={{ color: '#fff', fontSize: '1.05rem', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{text}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '32px 24px', marginBottom: '20px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', margin: 0 }}>Pick Truth or Dare to get a prompt</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <button onClick={() => pick('truth')} style={{ flex: 1, background: 'rgba(0,229,255,0.15)', border: '2px solid rgba(0,229,255,0.5)', color: 'var(--accent-cyan)', borderRadius: '16px', padding: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>TRUTH</button>
        <button onClick={() => pick('dare')} style={{ flex: 1, background: 'rgba(255,107,0,0.15)', border: '2px solid rgba(255,107,0,0.5)', color: '#FF6B00', borderRadius: '16px', padding: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>DARE</button>
      </div>
    </div>
  );
}

// 7.5 Charades Generator
const charadesWords = {
  movies: ['The Matrix', 'Titanic', 'Jurassic Park', 'Inception', 'Star Wars', 'Jaws', 'The Lion King', 'Forrest Gump', 'Avatar', 'Gladiator'],
  actions: ['Surfing', 'Baking a cake', 'Riding a horse', 'Playing tennis', 'Changing a diaper', 'Walking a dog', 'Mowing the lawn', 'Parallel parking', 'Juggling', 'Sneezing'],
  objects: ['Washing machine', 'Typewriter', 'Helicopter', 'Toothbrush', 'Coffee maker', 'Vacuum cleaner', 'Chainsaw', 'Binoculars', 'Lawnmower', 'Trombone'],
  hardcore: ['Schadenfreude', 'Existential crisis', 'Quantum physics', 'Procrastination', 'Déjà vu', 'Wi-Fi randomly disconnecting', 'Brain freeze', 'Impulse buying', 'Sleep paralysis', 'Auto-correct'],
};

function CharadesGenerator() {
  const [word, setWord] = useState('');
  const [category, setCategory] = useState<'movies' | 'actions' | 'objects' | 'hardcore'>('movies');

  const generateWord = () => {
    const pool = charadesWords[category];
    const newWord = pool[randomInt(0, pool.length - 1)];
    // Prevent immediate back-to-back duplicates if possible
    if (newWord === word && pool.length > 1) {
      generateWord();
    } else {
      setWord(newWord);
    }
  };

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🎭 Charades</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '24px', padding: '8px', marginBottom: '20px', width: '100%', maxWidth: '320px', justifyContent: 'center' }}>
        {(['movies', 'actions', 'objects', 'hardcore'] as const).map(c => (
          <button
            key={c}
            onClick={() => { setCategory(c); setWord(''); }}
            style={{ padding: '8px 16px', borderRadius: '16px', border: 'none', background: category === c ? '#FFE600' : 'transparent', color: category === c ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
          >
            {c}
          </button>
        ))}
      </div>
      
      {word ? (
        <div style={{ background: 'rgba(255,42,42,0.1)', border: '2px solid rgba(255,42,42,0.5)', borderRadius: '20px', padding: '32px 24px', marginBottom: '20px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '2px', marginBottom: '12px', textTransform: 'uppercase' }}>{category}</p>
          <p style={{ color: '#fff', fontSize: '1.6rem', lineHeight: 1.2, margin: 0, fontWeight: 900 }}>{word}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '40px 24px', marginBottom: '20px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', margin: 0 }}>Select a category and hit generate</p>
        </div>
      )}
      
      <button style={actionBtn} onClick={generateWord}>
        {word ? 'NEXT WORD' : 'GENERATE'}
      </button>
    </div>
  );
}

// 8. Scoreboard
function Scoreboard({ activeGuests = [] }: { activeGuests?: string[] }) {
  const defaultPlayers = activeGuests.length > 0
    ? activeGuests.map(name => ({ name, score: 0 }))
    : [{ name: 'Player 1', score: 0 }, { name: 'Player 2', score: 0 }];

  const [players, setPlayers] = useState<{ name: string; score: number }[]>(defaultPlayers);
  const [newName, setNewName] = useState('');

  // Sync when guests join the room late
  useEffect(() => {
    if (activeGuests.length > 0) {
      setPlayers(prev => {
        const existingMap = new Map(prev.map(p => [p.name, p.score]));
        return activeGuests.map(name => ({ name, score: existingMap.get(name) || 0 }));
      });
    }
  }, [activeGuests.join(',')]);

  const addPlayer = () => {
    const n = newName.trim();
    if (n) { setPlayers(p => [...p, { name: n, score: 0 }]); setNewName(''); }
  };

  const adjust = (i: number, delta: number) =>
    setPlayers(p => p.map((pl, idx) => idx === i ? { ...pl, score: pl.score + delta } : pl));

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={toolContainer}>
      <h2 style={toolTitle}>🏆 Scoreboard</h2>
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {sorted.map((pl, i) => {
          const realIdx = players.findIndex(p => p.name === pl.name);
          return (
            <div key={pl.name} style={{ background: i === 0 ? 'rgba(255,230,0,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${i === 0 ? '#FFE600' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <span style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => adjust(realIdx, -1)} style={{ ...counterBtn, padding: '4px 10px' }}>−</button>
                <span style={{ color: '#FFE600', fontWeight: 900, fontSize: '1.2rem', minWidth: '36px', textAlign: 'center' }}>{pl.score}</span>
                <button onClick={() => adjust(realIdx, 1)} style={{ ...counterBtn, padding: '4px 10px', background: 'rgba(255,230,0,0.15)', borderColor: 'rgba(255,230,0,0.3)', color: '#FFE600' }}>+</button>
                <button onClick={() => setPlayers(p => p.filter((_, idx) => idx !== realIdx))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}>×</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '360px', marginBottom: '12px' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} placeholder="Add player…" style={{ ...inlineInput, flex: 1 }} />
        <button onClick={addPlayer} style={counterBtn}>+</button>
      </div>
      <button style={{ ...actionBtn, background: 'rgba(255,255,255,0.08)', color: '#fff', width: '100%', maxWidth: '360px' }} onClick={() => setPlayers(p => p.map(pl => ({ ...pl, score: 0 })))}>RESET SCORES</button>
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
  { id: 'bill', label: 'Bill Splitter', icon: '💰', color: 'rgba(0,200,100,0.12)' },
  { id: 'charades', label: 'Charades', icon: '🎭', color: 'rgba(255,42,42,0.12)' },
  { id: 'truth', label: 'Truth or Dare', icon: '🃏', color: 'rgba(180,0,255,0.12)' },
  { id: 'scoreboard', label: 'Scoreboard', icon: '🏆', color: 'rgba(255,200,0,0.12)' },
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

export default function ToolsPanel({ activeTool: externalTool, activeGuests = [], groups = {}, location = '', onClose }: { activeTool?: Tool; activeGuests?: string[]; groups?: Record<string, string[]>; location?: string; onClose: () => void }) {
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
        {activeTool !== 'home' ? (
          <button onClick={() => setActiveTool('home')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }}>←</button>
        ) : (
          <div style={{ width: '44px', height: '44px', flexShrink: 0 }} /> /* Spacer to keep title centered */
        )}
        <h1 style={{ flex: 1, margin: 0, color: '#FFE600', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px', textAlign: 'center' }}>
          {activeTool === 'home' ? '🎲 Party Tools' : toolList.find(t => t.id === activeTool)?.label ?? ''}
        </h1>
        <button onClick={onClose} style={{ background: 'rgba(255,42,42,0.15)', border: '1px solid rgba(255,42,42,0.4)', color: '#ff7070', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, fontWeight: 900 }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '20px', paddingBottom: '140px' }}>
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
        {activeTool === 'bottle' && <SpinBottle activeGuests={activeGuests} />}
        {activeTool === 'randomizer' && <Randomizer activeGuests={activeGuests} groups={groups} />}
        {activeTool === 'timer' && <TimerTool />}
        {activeTool === 'bill' && <BillSplitter location={location} />}
        {activeTool === 'charades' && <CharadesGenerator />}
        {activeTool === 'truth' && <TruthOrDare />}
        {activeTool === 'scoreboard' && <Scoreboard activeGuests={activeGuests} />}
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
