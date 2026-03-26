# ElevenLabs Client Tool JSON Configurations

Copy and paste these directly into the **JSON** tab when adding a Client Tool in the ElevenLabs Dashboard.

**Status:** 9 live ✅ (All Tools Added to Dashboard)

---

## ✅ LIVE TOOLS (already in dashboard)

### 1. `openTool`
Opens any of the 8 party tools by voice.

```json
{
  "type": "client",
  "name": "openTool",
  "description": "Opens a specific party tool when the user expresses the desire to use one — by voice or any natural phrasing. Users might say 'I wanna flip a coin', 'yo let's decide randomly', 'three dice please', 'how long has it been?', 'split the check', or 'let's play truth or dare'.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_tool",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Must be one of the enums: coin, dice, bottle, randomizer, timer, bill, truth, scoreboard",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 2. `switchMode`
Switches the main UI mode.

```json
{
  "type": "client",
  "name": "switchMode",
  "description": "Switches the UI to a different mode when the user asks to find a spot, find a plug, play a game, or use the party tools.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_mode",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Must be one of: locator, plug, game-master, or tools.",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 3. `createMemory`
Saves a shareable moment to the Trophy Room.

```json
{
  "type": "client",
  "name": "createMemory",
  "description": "Saves a shareable moment to the user's Memories / Trophy Room. Call this for: game wins, epic quotes, location drops, plug moments that came through, or any time the vibe peaked. Proactively suggest capturing moments — max 2-3 per session. Always write a punchy, social-media-ready shareCaption.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_type",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Category of moment. One of: location_drop, game_win, plug_moment, cruisehq_quote, party_milestone, group_capture, moment",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_title",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "A short, punchy title for the memory (e.g. 'Alex Won Truth or Dare 👑', 'The Night We Found The Plug 🔌')",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_content",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "The actual quote, description, or moment detail",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_shareCaption",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "A short, social-media ready caption for sharing (1-2 lines, emoji, relevant hashtags like #TheCruiseGod #TCG). Make it viral-worthy.",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

## ⬆️ ADD THESE TO DASHBOARD NOW

### 4. `updateGameState`
Updates live game session UI — scores, turns, timer.

```json
{
  "type": "client",
  "name": "updateGameState",
  "description": "Updates the live game session UI panel. Call this whenever: a game starts, a player scores, it's a new turn, the timer changes, or the game ends. Always pass the full current state so the scoreboard stays accurate.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_gameName",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Name of the game being played (e.g. 'Truth or Dare', 'Kings Cup', 'Charades')",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_status",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Game status: 'playing', 'paused', or 'finished'",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_players",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "JSON array of player objects, each with 'name' (string) and 'score' (number). Example: [{\"name\":\"Alex\",\"score\":3},{\"name\":\"Blake\",\"score\":1}]",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_currentTurn",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Name of the player whose turn it currently is",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_timer",
      "type": "number",
      "value_type": "llm_prompt",
      "description": "Remaining time in seconds for the current turn or challenge",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_rulesSummary",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "One-line summary of current game rules or mode",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 5. `displayResults`
Pushes search results (spots, plugs, services) to the UI card.

```json
{
  "type": "client",
  "name": "displayResults",
  "description": "Pushes location or plug search results into the UI so users can visually browse while the agent explains them. Call this after finding spots or services, before listing them verbally.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_type",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Type of results: 'locations', 'plugs', or 'services'",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_query",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "The original search query or request from the user",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_results",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "JSON array of result objects. Each object should have: title (string), description (string), address (string, optional), rating (string, optional), price (string, optional), url (string, optional). Example: [{\"title\":\"Eko Hotel\",\"description\":\"Iconic Lagos venue on the island\",\"address\":\"Victoria Island\",\"rating\":\"4.5\"}]",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 6. `showQR`
Shows the CruiseHQ QR code modal by voice.

```json
{
  "type": "client",
  "name": "showQR",
  "description": "Opens the CruiseHQ QR code scanner modal so guests can join the room. Use this when the user says things like 'show the QR', 'let people join', 'bring everyone in', 'scan to join', or 'open CruiseHQ'.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 7. `randomizeGroups`
Splits CruiseHQ guests into random groups by voice.

```json
{
  "type": "client",
  "name": "randomizeGroups",
  "description": "Randomly splits all active CruiseHQ guests into teams. Use this when user says things like 'split everyone up', 'make 2 teams', 'randomize the groups', 'put us in teams of 3', or 'divide the crew'.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_numGroups",
      "type": "number",
      "value_type": "llm_prompt",
      "description": "Number of groups to split guests into. Default to 2 if not specified.",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_mode",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "How to sort the groups. Must be one of: 'auto' (random shuffle), 'self-select' (creates empty groups for users to pick), or 'smart' (you ask the room for a parameter like gender/zodiac and guide them).",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    },
    {
      "id": "param_param",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "If mode is 'smart', this is the parameter you are sorting by (e.g. 'gender', 'zodiac sign', 'vibe'). Leave empty for other modes.",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 8. `setGroupLeader`
Elects a specific guest as the leader of a group.

```json
{
  "type": "client",
  "name": "setGroupLeader",
  "description": "Elects a specific user as the leader/captain of a specific group. Call this when the host asks you to pick a leader, when the group votes on someone, or when you randomly decide who should lead.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_groupName",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "The exact name of the group (e.g. 'Group A', 'Group B', etc.)",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_leader",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "The name of the guest being elected as leader",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    }
  ],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```

---

### 9. `analyzeImage`
Opens the camera for OCR/Vision — bill scanning, custom instructions, drink checks, game vision.

```json
{
  "type": "client",
  "name": "analyzeImage",
  "description": "Opens the device camera to capture and analyze an image with AI vision. Use for: splitting bills by scanning a receipt, verifying drinks/medicines by scanning barcodes or NAFDAC numbers, analyzing a board/card game state, answering a custom user question about their surroundings, or any general visual context.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [
    {
      "id": "param_task",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "The analysis task. One of: 'bill_split' (scan receipt/extract totals), 'drink_check' (assess bottle/label/barcode authenticity, or NAFDAC verification), 'game_vision' (analyze game state), 'general'",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "param_prompt",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Specific instruction for the vision model. What exactly should it look for or calculate?",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": false
    }
  ],
  "dynamic_variables": {
    "dynamic_variable_placeholders": {}
  },
  "response_mocks": []
}
```

---

### 10. `captureScreen`
Captures a full-screen screenshot and saves it to the Trophy Room.

```json
{
  "type": "client",
  "name": "captureScreen",
  "description": "Takes a full-screen screenshot of the application state (e.g. the Game Scoreboard, the Room Chat, or Search Results) and saves it to the user's Memories. Call this when the user says 'take a screenshot', 'capture this score', 'save this view', or asks you to take a picture of what's currently on screen.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "tool_error_handling_mode": "auto",
  "execution_mode": "immediate",
  "assignments": [],
  "expects_response": false,
  "response_timeout_secs": 1,
  "parameters": [],
  "dynamic_variables": { "dynamic_variable_placeholders": {} }
}
```
