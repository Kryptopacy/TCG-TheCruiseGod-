'use client';

import React, { useState } from 'react';

export type GroupState = { members: string[]; leader: string | null };

const GROUP_COLORS = ['#FFE600', '#FF8C00', '#FF2A2A', '#00E5FF', '#7B61FF', '#FF64C8'];

interface GroupsPanelProps {
  activeGuests: string[];
  groups: Record<string, GroupState>;
  onCreateGroups: (numGroups: number, mode: 'auto' | 'self-select' | 'smart', param?: string) => void;
  onClearGroups: () => void;
  onSetLeader: (groupName: string, leader: string) => void;
  onMoveGuest: (guest: string, toGroup: string | null) => void;
  onStartLeaderPoll: (groupName: string) => void;
}

function getGuestGroup(guest: string, groups: Record<string, GroupState>): string | null {
  for (const [name, state] of Object.entries(groups)) {
    if (state.members.includes(guest)) return name;
  }
  return null;
}

export default function GroupsPanel({
  activeGuests,
  groups,
  onCreateGroups,
  onClearGroups,
  onSetLeader,
  onMoveGuest,
  onStartLeaderPoll,
}: GroupsPanelProps) {
  const [numGroups, setNumGroups] = useState(2);
  const [mode, setMode] = useState<'auto' | 'self-select' | 'smart'>('auto');
  const [sortParam, setSortParam] = useState('');
  const [activeSection, setActiveSection] = useState<'create' | 'roster' | 'groups'>('create');

  const groupNames = Object.keys(groups);
  const hasGroups = groupNames.length > 0;
  const unassigned = activeGuests.filter(g => getGuestGroup(g, groups) === null);

  const modeConfig = {
    auto: { label: '🎲 Auto', desc: 'Randomly shuffle everyone into equal groups instantly.' },
    'self-select': { label: '✋ Self-Select', desc: 'Guests see group buttons on their phones and pick their own group.' },
    smart: { label: '🧠 Smart', desc: 'Give TCG a parameter to sort by (e.g. "gender", "team colour").' },
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      {/* ── Tip Banner ── */}
      <div style={{
        background: 'rgba(255,200,0,0.07)', border: '1px solid rgba(255,200,0,0.18)',
        borderRadius: '12px', padding: '10px 14px', margin: '0 0 14px',
        fontSize: '0.72rem', color: 'rgba(255,230,150,0.75)', lineHeight: 1.5,
      }}>
        💬 <strong style={{ color: '#FFE600' }}>Voice shortcut:</strong>{' '}
        "TCG, split the room into 3 groups" · "Pick a leader for Group A" · "Create 4 teams by gender"
      </div>

      {/* ── Section Switcher ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {(['create', 'roster', 'groups'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: '10px', border: 'none',
              background: activeSection === s ? 'linear-gradient(135deg,#FFE600,#FF8C00)' : 'rgba(255,255,255,0.06)',
              color: activeSection === s ? '#1a0000' : 'rgba(255,230,150,0.55)',
              fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.04em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {s === 'create' ? '⚙️ Setup' : s === 'roster' ? `👥 Roster${unassigned.length > 0 ? ` (${unassigned.length}⚠)` : ''}` : `🎯 Groups${hasGroups ? ` (${groupNames.length})` : ''}`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ────────── SETUP SECTION ────────── */}
        {activeSection === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Num Groups Stepper */}
            <div style={sectionCard}>
              <label style={labelStyle}>Number of Groups</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <button onClick={() => setNumGroups(n => Math.max(2, n - 1))} style={stepBtn}>−</button>
                <span style={{ color: '#FFE600', fontWeight: 900, fontSize: '2rem', minWidth: '48px', textAlign: 'center' }}>
                  {numGroups}
                </span>
                <button onClick={() => setNumGroups(n => Math.min(Math.max(activeGuests.length, 10), n + 1))} style={stepBtn}>+</button>
              </div>
              {activeGuests.length > 0 && (
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,230,150,0.5)', margin: '8px 0 0', textAlign: 'center' }}>
                  ~{Math.ceil(activeGuests.length / numGroups)} people per group
                </p>
              )}
            </div>

            {/* Sort Mode */}
            <div style={sectionCard}>
              <label style={labelStyle}>Sort Mode</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {(['auto', 'self-select', 'smart'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '10px 14px', borderRadius: '10px', border: 'none',
                      background: mode === m ? 'rgba(255,200,0,0.12)' : 'rgba(255,255,255,0.04)',
                      outline: mode === m ? '1.5px solid rgba(255,200,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ color: mode === m ? '#FFE600' : 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: '0.85rem' }}>
                      {modeConfig[m].label}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '2px' }}>
                      {modeConfig[m].desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Param */}
            {mode === 'smart' && (
              <div style={sectionCard}>
                <label style={labelStyle}>Sort Parameter</label>
                <input
                  value={sortParam}
                  onChange={e => setSortParam(e.target.value)}
                  placeholder='e.g. "gender: male, female" or "team colour"'
                  style={{
                    width: '100%', marginTop: '10px', background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,200,0,0.2)', color: '#fff', padding: '10px 14px',
                    borderRadius: '10px', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '0.68rem', color: 'rgba(255,200,150,0.5)', marginTop: '8px' }}>
                  TCG will ask your guests the relevant questions and sort accordingly.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => onCreateGroups(numGroups, mode, mode === 'smart' ? sortParam : undefined)}
                disabled={activeGuests.length < 2}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                  background: activeGuests.length >= 2 ? 'linear-gradient(135deg,#FFE600,#FF8C00)' : 'rgba(255,255,255,0.08)',
                  color: activeGuests.length >= 2 ? '#1a0000' : 'rgba(255,255,255,0.3)',
                  fontWeight: 900, fontSize: '0.9rem', cursor: activeGuests.length >= 2 ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.05em',
                }}
              >
                {activeGuests.length < 2 ? 'Waiting for guests…' : `CREATE ${numGroups} GROUPS`}
              </button>
              {hasGroups && (
                <button
                  onClick={onClearGroups}
                  style={{
                    padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(255,42,42,0.4)',
                    background: 'rgba(255,42,42,0.08)', color: '#FF7070', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                  }}
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>
        )}

        {/* ────────── ROSTER SECTION ────────── */}
        {activeSection === 'roster' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeGuests.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0', fontStyle: 'italic' }}>
                No cruisers connected yet…
              </p>
            ) : (
              activeGuests.map((guest, i) => {
                const assignedGroup = getGuestGroup(guest, groups);
                const isLeader = assignedGroup && groups[assignedGroup]?.leader === guest;
                return (
                  <div
                    key={guest}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span style={{ color: 'rgba(255,230,150,0.5)', fontSize: '0.7rem', fontWeight: 700, minWidth: '18px' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                      {isLeader ? '👑 ' : ''}{guest}
                    </span>
                    {hasGroups ? (
                      <select
                        value={assignedGroup || ''}
                        onChange={e => onMoveGuest(guest, e.target.value || null)}
                        style={{
                          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,200,0,0.2)',
                          color: assignedGroup ? '#FFE600' : 'rgba(255,255,255,0.4)',
                          padding: '5px 8px', borderRadius: '8px', fontSize: '0.75rem',
                          outline: 'none', cursor: 'pointer', fontWeight: 700,
                        }}
                      >
                        <option value=''>Unassigned</option>
                        {groupNames.map(gn => (
                          <option key={gn} value={gn}>{gn}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                        No groups yet
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ────────── GROUPS SECTION ────────── */}
        {activeSection === 'groups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!hasGroups ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '16px' }}>
                  No groups created yet.
                </p>
                <button
                  onClick={() => setActiveSection('create')}
                  style={{ background: 'linear-gradient(135deg,#FFE600,#FF8C00)', border: 'none', color: '#1a0000', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                >
                  ⚙️ Go to Setup
                </button>
              </div>
            ) : (
              groupNames.map((gName, gi) => {
                const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                const state = groups[gName];
                const leader = state.leader;
                return (
                  <div
                    key={gName}
                    style={{
                      borderRadius: '16px', overflow: 'hidden',
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {/* Group Header */}
                    <div style={{
                      background: `${color}15`, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: `1px solid ${color}20`,
                    }}>
                      <div>
                        <span style={{ color, fontWeight: 900, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
                          {gName}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginLeft: '8px' }}>
                          {state.members.length} member{state.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {leader ? (
                        <span style={{
                          background: `${color}25`, border: `1px solid ${color}50`,
                          color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
                        }}>
                          👑 {leader}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', fontStyle: 'italic' }}>
                          No leader
                        </span>
                      )}
                    </div>

                    {/* Members List */}
                    <div style={{ padding: '10px 16px 4px' }}>
                      {state.members.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontStyle: 'italic', margin: '0 0 10px' }}>
                          Empty — assign guests from Roster tab
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {state.members.map(m => (
                            <span
                              key={m}
                              style={{
                                background: m === leader ? `${color}20` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${m === leader ? `${color}50` : 'rgba(255,255,255,0.1)'}`,
                                color: m === leader ? color : 'rgba(255,255,255,0.8)',
                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: m === leader ? 800 : 400,
                              }}
                            >
                              {m === leader ? '👑 ' : ''}{m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Leader Actions */}
                    {state.members.length >= 2 && (
                      <div style={{ display: 'flex', gap: '8px', padding: '0 16px 14px' }}>
                        <button
                          onClick={() => {
                            const eligible = state.members.filter(m => m !== leader);
                            if (eligible.length === 0) return;
                            onSetLeader(gName, eligible[Math.floor(Math.random() * eligible.length)]);
                          }}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '10px',
                            background: `${color}18`, border: `1px solid ${color}35`,
                            color, fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer',
                          }}
                        >
                          🎲 Random Leader
                        </button>
                        <button
                          onClick={() => onStartLeaderPoll(gName)}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                          }}
                        >
                          📊 Group Poll
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <style>{`
        select option { background: #1a0a0a; }
      `}</style>
    </div>
  );
}

// ── Shared Styles ──
const sectionCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', padding: '14px 16px',
};
const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'rgba(255,200,150,0.6)',
};
const stepBtn: React.CSSProperties = {
  background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.25)',
  color: '#FFE600', borderRadius: '10px', width: '40px', height: '40px',
  fontSize: '1.4rem', fontWeight: 900, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};
