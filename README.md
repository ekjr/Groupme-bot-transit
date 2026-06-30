# Groupme-bot-transit
A GroupMe bot that automatically converts messages in the format:
"origin" to "destination"
into step-by-step public transit directions using the Google Maps Directions API.

---

## ✨ Features

- Auto-detects messages like:
  - `Times Square to JFK Airport`
  - `Jerusalem Central Station to Hebrew University`
- Uses Google Maps Transit routing
- Splits directions into multiple GroupMe messages
- Step-by-step instructions (walk + bus/train)
- Real-time departure/arrival estimates
- Automatic message chunking to avoid GroupMe limits
- Optional English + imperial units support

---

## ⚙️ Setup

### 1. Create a GroupMe Bot
- Go to: https://dev.groupme.com/bots
- Create a bot in your group
- Copy the `bot_id`

---

### 2. Enable Google Maps API
In Google Cloud Console:
- Enable:
  - Directions API
- Make sure billing is enabled
- Create an API key

---

### 3. Add Script to Google Apps Script
- Go to: https://script.google.com
- Create a new project
- Paste `Code.gs`
- Replace:

```js
var BOT_ID = "YOUR_BOT_ID";
var MAPS_API_KEY = "YOUR_API_KEY";