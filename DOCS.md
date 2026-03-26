# TCG Technical Documentation

## Table of Contents

- [System Overview](#system-overview)
- [API Routes](#api-routes)
- [Firecrawl Search Pipeline](#firecrawl-search-pipeline)
- [ElevenLabs Integration](#elevenlabs-integration)
- [CruiseHQ Multiplayer System](#cruisehq-multiplayer-system)
- [Vision System](#vision-system)
- [Database Schema](#database-schema)
- [Authentication & Security](#authentication--security)
- [Environment Variables](#environment-variables)

---

## System Overview

TCG is a Next.js 15 application using the App Router with Edge Runtime for API routes. The core orchestrator is `ConversationManager.tsx`, which manages the ElevenLabs voice session, Supabase Realtime subscriptions, UI mode state, and all client tool handlers.

### Request Flow

1. User taps the character avatar → `startConversation()` fires
2. A signed URL is fetched from `/api/get-signed-url`
3. An ElevenLabs session starts with Client Tools and a dynamic system prompt
4. The agent listens, responds, and calls Client Tools which mutate React state
5. Search requests route through `/api/search`, `/api/search-games`, or `/api/search-plugs`
6. Vision requests route through `/api/vision`
7. CruiseHQ guest actions arrive via Supabase Realtime Broadcast

---

## API Routes

All API routes live in `app/src/app/api/`.

### `GET /api/get-signed-url`

**Runtime:** Edge

Exchanges the server-side `ELEVENLABS_API_KEY` for a signed WebSocket URL. The client never touches the API key directly.

**Query params:**
- `agentId` (optional) — Override the default agent. Falls back to `NEXT_PUBLIC_AGENT_ID`.

**Response:**
```json
{ "signedUrl": "wss://..." }
```

---

### `POST /api/search`

**Runtime:** Edge

Searches for locations (restaurants, bars, events) using Firecrawl.

**Request body:** `SearchRequest`
```typescript
{
  query: string;       // "rooftop bar"
  location?: string;   // "Lagos, Nigeria"
  limit?: number;      // max 10
}
```

**Auth-aware rate limiting:**
- Authenticated users: 100 requests / day (sliding window)
- Anonymous users: 5 requests / hour

---

### `POST /api/search-games`

**Runtime:** Edge

Searches for party games with Markdown rule extraction.

**Request body:** `SearchRequest`
```typescript
{
  query: string;           // "drinking game"
  num_people?: number;     // 6
  energy_level?: string;   // "chaotic"
  setting?: string;        // "outdoor"
}
```

**Returns:** Results include a `rules_content` field with the full Markdown body scraped by Firecrawl.

---

### `POST /api/search-plugs`

Searches for local service providers (mechanics, DJs, tailors).

**Request body:** `SearchRequest`
```typescript
{
  query: string;       // "barber"
  location?: string;   // "Lekki, Lagos"
  urgent?: boolean;    // true → restricts to results from the past week
}
```

---

### `POST /api/vision`

**Runtime:** Edge

Accepts a base64-encoded image and a task type. Returns structured JSON from Gemini 2.5 Flash.

**Request body:**
```typescript
{
  image: string;         // data:image/jpeg;base64,...
  task: VisionTask;      // "bill_split" | "drink_check" | "game_vision" | "general"
  prompt?: string;       // Optional additional context
}
```

**Response:**
```typescript
{
  success: true,
  task: "bill_split",
  result: "The total is $45.60. Split 4 ways that's $11.40 each.",
  structured: {
    total: 45.60,
    subtotal: 38.00,
    tax: 4.60,
    items: [{ name: "Jollof Rice", price: 12.00 }]
  }
}
```

---

## Firecrawl Search Pipeline

Defined in `app/src/app/lib/firecrawl.ts`.

### Cache Hierarchy

```
performFirecrawlSearch(req)
  │
  ├─ 1. Supabase Permanent DB
  │     Table: tcg_locations | tcg_games | tcg_plugs
  │     TTL: 7 days (stale entries deleted and re-fetched)
  │     Match: query_key + location_key
  │
  ├─ 2. Upstash Redis
  │     Key: tcg:{type}:{query}:{location}
  │     TTL: 15 minutes
  │
  └─ 3. Firecrawl API (POST https://api.firecrawl.dev/v1/search)
        Timeout: 15s (locations/plugs), 20s (games)
        Results saved to both caches in background
```

### Query Builder

The `buildSearchQuery` function transforms structured request parameters into optimized search strings:

| Type | Input | Generated Query |
|---|---|---|
| locations | `{ query: "jazz bar", location: "Brooklyn" }` | `"jazz bar near Brooklyn reviews open hours atmosphere"` |
| games | `{ query: "card game", num_people: 4, energy_level: "chaotic" }` | `"card game for 4 players wild hilarious high-energy party game rules how to play"` |
| plugs | `{ query: "tailor", location: "Lekki", urgent: true }` | `"tailor near Lekki available now open today same-day service provider contact"` |

### Rate Limit Handling

429 responses from Firecrawl return a `retryable: true` flag so the frontend can show a retry prompt.

---

## ElevenLabs Integration

### Client Tools

Registered during `conversation.startSession()` and mirroring `elevenlabs_json_tools.md`:

| Tool Name | Parameters | Effect |
|---|---|---|
| `switchMode` | `mode` (string) | Snaps the UI to `locator`, `plug`, `game-master`, or `tools` |
| `openTool` | `tool` (string) | Opens a specific tool (e.g., `coin`, `dice`, `bottle`, `randomizer`) |
| `createMemory` | `type`, `title`, `content`, `shareCaption` | Takes a screenshot, uploads to Supabase Storage, saves a Trophy |
| `updateGameState` | `gameName`, `status`, `players`, `currentTurn`, `timer`, `rulesSummary` | Synchronizes the Game Session dashboard |
| `displayResults` | `type`, `query`, `results` (JSON array) | Populates search result cards after Firecrawl scraping |
| `showQR` | `none` | Displays the CruiseHQ QR code overlay |
| `randomizeGroups` | `numGroups` (number) | Splits active guests into N random groups |
| `analyzeImage` | `task` (enum), `prompt` | Opens the camera for `bill_split`, `drink_check`, `game_vision`, or `general` |
| `captureScreen` | `none` | Captures a full-screen screenshot of the current UI payload |

### Dynamic System Prompt

The prompt is assembled at session start using structured XML tags and includes:

```xml
<dynamic_context>
  User Name: {userName}
  User Location: {location}
  Current UI Mode: {activeMode}
  CruiseHQ Room Code: {roomId} | Active Guests: {guests}
  User's Wingman Protocols: {wingmanPreferences}
</dynamic_context>

<role>
  TCG persona — world-class AI concierge, local expert, and game master
</role>

<personality_core>
  Energy matching, personalization, humor style, brevity (max 2-3 sentences),
  cultural awareness
</personality_core>

<core_workflows>
  6 numbered workflows mapping intents to tool chains:
  1. Finding Spots → switchMode("locator") + displayResults()
  2. Finding Services → switchMode("plug") + displayResults()
  3. Game Master Protocol → switchMode("game-master") + openTool()
  4. Party Tools → openTool(tool)
  5. Vision → analyzeImage(task)
  6. CruiseHQ & Polls → showQR() + guest interaction
</core_workflows>

<critical_behaviors>
  Latency management (filler words before tool execution),
  barge-in recovery, proactive memory captures (max 2-3/session),
  mode auto-detection from context
</critical_behaviors>

<advanced_nlp_handling>
  Multi-threaded request triage, slang comprehension,
  auto-pivot on interruptions
</advanced_nlp_handling>
```

This allows the agent to greet the user by name, give location-aware recommendations, and honor saved preferences without re-asking.

### Memory Type Taxonomy

The `createMemory` tool accepts these types, each triggering different viral `shareCaption` styles:

| Type | When Used |
|---|---|
| `location_drop` | Agent recommends a spot |
| `game_win` | A player wins a game |
| `plug_moment` | A service provider is found |
| `cruisehq_quote` | Memorable group chat moment |
| `party_milestone` | Milestone event (e.g., 10 guests joined) |
| `group_capture` | Group photo or group achievement |
| `moment` | General catch-all |

---

## CruiseHQ Multiplayer System

### Host Side (ConversationManager.tsx + CruiseHQ.tsx)

On mount, the host:
1. Generates a 4-char room code
2. Subscribes to `room:{code}` on Supabase Realtime
3. Listens for:
   - **Presence sync** — tracks guest joins/leaves, notifies the agent
   - **`guest_action`** — chat, dare, truth, song, charades submissions
   - **`room_chat`** — group chat messages; @TCG mentions forwarded to agent
   - **`cohost_request`** — shows approval toast
   - **`cohost_voice`** — transcribed speech from approved co-hosts

### Guest Side (room/[id]/page.tsx)

Guests visit `/room/{CODE}` and:
1. Set a CruiseID (FCFS — duplicates rejected via Presence state check)
2. Join via Supabase Presence tracking
3. Choose action type: Chat, Dare, Truth, Song, or Charades
4. Attach images (capped at 1MB base64 for broadcast safety)
5. Send submissions via Broadcast → received on host
6. Optionally request Co-host → upon approval, gain remote mic access via SpeechRecognition API

### Group System

The host (or the voice agent via the `randomizeGroups` Client Tool) can split guests into named groups. CruiseHQ renders:
- A **Main Room** tab visible to everyone
- A **tab per group** with scoped messages (`ChatMessage.groupId`)
- Host sees all tabs; guests see Main Room + their own group(s)

Group colors cycle through: `#00E5FF`, `#FF2A2A`, `#FFE600`, `#E040FB`, `#00FF66`.

### In-Room Decision Tools

**PollCreator:**
- Any participant can create a poll with a question and 2 options
- Supports anonymous voting (hides voter names, shows only percentages)
- Votes are broadcast as `{ type: 'vote', msgId, voter, option }` events
- Vote state is mutated in-place on the original poll message across all clients
- Real-time vote bars with percentage calculations

**ChatRandomizer:**
- Slot-machine spinner embedded in the chat input area
- Auto-loads the active group members for the current tab
- Spins through 20 rapid iterations, lands on a random member
- Result is broadcast as a highlighted chat message: `🎲 Randomizer chose: {name}!`

### Memory Saving from Chat

Any non-TCG chat message can be saved as a Trophy via the "📸 SAVE TO MEMORIES" button, which calls the `onSaveMemory` callback passed from `ConversationManager`.

---

## UI Systems & Fallbacks

### Splash Screen & Waveform

- **Splash Screen:** A dramatic full-screen overlay with a floating TCG logo and "TAP TO ENTER" button. Tapping sets `isStarted=true` and initializes the ElevenLabs WebSocket.
- **Waveform Visualizer:** A full-width animated CSS waveform (`WaveformVisualizer.tsx`) behind the character avatar. Colors adapt to the mode (Locator=Green, Plug=Gold, Game Master=Red).

### Chat Fallback & Image Push

`ChatFallback.tsx` provides a slide-up drawer for environments where voice fails:
- **Text input:** Sent directly into the live ElevenLabs agent session via `conversation.sendUserMessage()`
- **Image Push:** Guests or the primary user can push images to a full-screen `pushedImage` overlay (appears at z-index 200, dismissed on tap).

### Overlays & Modals

- **Cruiser Roster:** Tapping the "👥 N Cruisers" badge opens a full-screen modal showing all guests with group badges. Contains Quick Actions (`SPLIT 50/50`, `3 GROUPS`, `RESET`).
- **Settings Modal:** Quick inline display name customization (`localStorage` backed).
- **Manual Capture FAB:** A persistently floating 📸 button allows the user to snap a screen memory without asking the agent.
- **QR Code Modal:** Dynamically generates a joining link (`https://api.qrserver.com/v1/create-qr-code/`) pointing to the active `{roomId}`.

---

## Profile System

### Wingman Protocols

The `/profile` page (behind Supabase auth) lets users configure:
- **Display Name** — Ensures TCG addresses them correctly
- **Wingman Preferences** — Secret instructions (e.g., "Always suggest dive bars", "Keep it strictly PG")

Both are stored in Supabase `user_metadata` under the `auth.users` table and injected into the `<dynamic_context>` XML block on every session initialization.

---

## Charades Hidden Word

When a guest submits a charades word from their phone, the payload skips the host's visual transcript (rendering as `[HIDDEN]`) but is sent silently into the agent's context block. Only TCG knows the word.

---

**`trophies`** — User-captured memories
| Column | Type | Notes |
|---|---|---|
| id | text (PK) | Client-generated |
| user_id | uuid | `auth.uid()` default |
| type | text | moment, game_result, recommendation |
| title | text | |
| content | text | |
| mode | text | locator, plug, game-master, tools |
| image_url | text | Supabase Storage public URL |
| created_at | timestamptz | |

RLS: Users can only read/write their own rows.

**`tcg_locations`** / **`tcg_plugs`** — Cached Firecrawl search results
| Column | Type |
|---|---|
| query_key | text |
| location_key | text |
| title | text |
| description | text |
| url | text |
| created_at | timestamptz |

**`tcg_games`** — Cached game search results
| Column | Type |
|---|---|
| query_key | text |
| title | text |
| description | text |
| url | text |
| rules_content | text |

### Supabase Storage

**Bucket: `trophies`** — Stores PNG screenshots captured via `html2canvas`, uploaded by authenticated users. Path: `{user_id}/{moment_id}.png`.

---

## Authentication & Security

### Demo Mode vs Production Mode

Controlled via the Admin Console at `/admin`:

| Mode | Auth | Trophy Storage | Rate Limits |
|---|---|---|---|
| Demo | Bypassed (no login required) | localStorage | Applied via IP |
| Production | Supabase email/password | PostgreSQL with RLS | Applied via user ID |

The mode is stored as a cookie (`tcg_demo_mode`). The root layout reads this cookie to conditionally render the `AuthButton` component.

### Admin Access

- **Demo Mode:** Password-gated (sessionStorage)
- **Production Mode:** Requires Supabase login with the approved admin email

### Rate Limiting

Implemented via Upstash Redis sliding window ratelimiters on the `/api/search` route:
- Authenticated: 100 requests / 24 hours
- Anonymous: 5 requests / 1 hour

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ELEVENLABS_API_KEY` | Yes | Server-side key for signed URL generation |
| `NEXT_PUBLIC_AGENT_ID` | Yes | ElevenLabs Conversational AI agent ID |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl Search API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps reverse geocoding |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis auth token |
| `GEMINI_API_KEY` | For Vision | Google Gemini API key |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry error tracking DSN |
| `NEXT_PUBLIC_DEMO_MODE` | Optional | Set to `"true"` to force demo mode |
