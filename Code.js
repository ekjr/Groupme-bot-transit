// ── CONFIGURATION — fill these in ──────────────────────────
var BOT_ID       = "YOUR_BOT_ID";        // from dev.groupme.com/bots
var MAPS_API_KEY = "YOUR_API_KEY"; // from console.cloud.google.com
// ────────────────────────────────────────────────────────────

// ── DEBUG — run this manually from the Apps Script editor ───
// Click the function dropdown at the top, select "debugTest",
// then click Run. Check the Execution Log for output.
function debugTest() {
  var url = "https://maps.googleapis.com/maps/api/directions/json"
    + "?origin=" + encodeURIComponent("Times Square, New York")
    + "&destination=" + encodeURIComponent("Grand Central Terminal, New York")
    + "&mode=transit"
    + "&key=" + MAPS_API_KEY;

  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var text = response.getContentText();
  var data = JSON.parse(text);

  Logger.log("HTTP status: " + response.getResponseCode());
  Logger.log("API status:  " + data.status);
  if (data.error_message) Logger.log("Error msg:   " + data.error_message);
  if (data.status === "OK") {
    Logger.log("SUCCESS - duration: " + data.routes[0].legs[0].duration.text);
  }
}

// ── ENTRY POINT ─────────────────────────────────────────────
// GroupMe POSTs every group message here as a webhook.
function doPost(e) {
  var post = JSON.parse(e.postData.getDataAsString());
  var text = (post.text || "").trim();

  // Ignore messages sent by bots (prevent infinite loops)
  if (post.sender_type === "bot") return;
  if (!text) return;

  // Try to parse any message as "<origin> to <destination>"
  var parts = splitOriginDest(text);
  if (parts) {
    handleTransitRequest(parts[0], parts[1]);
  }
}

// ── TRANSIT LOGIC ────────────────────────────────────────────
function handleTransitRequest(origin, dest) {
  var directions = getTransitDirections(origin, dest);

  // directions is an array of message strings, send each one
  directions.forEach(function(msg, i) {
      if (i > 0) Utilities.sleep(1000);
      sendText(msg);
  });
}

function splitOriginDest(text) {
  // Match " to " anywhere in the message (case-insensitive)
  var idx = text.search(/ to /i);
  if (idx === -1) return null;
  var origin = text.substring(0, idx).trim();
  var dest   = text.substring(idx + 4).trim();
  if (!origin || !dest) return null;
  return [origin, dest];
}

// ── GOOGLE MAPS DIRECTIONS API (transit mode) ────────────────
// Uses the Directions API (Legacy) — costs ~$0.005/request.
// For a personal bot with low usage this stays within the free tier.
// Set a daily quota cap in Google Cloud Console -> APIs ->
// Directions API -> Quotas to prevent any surprise charges.
function getTransitDirections(origin, destination) {
  var url = "https://maps.googleapis.com/maps/api/directions/json"
    + "?origin="      + encodeURIComponent(origin)
    + "&destination=" + encodeURIComponent(destination)
    + "&mode=transit"
    + "&departure_time=now"
    + "&alternatives=false"
    + "&language=en"
    + "&units=imperial"
    + "&key=" + MAPS_API_KEY;

  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());

    if (data.status === "ZERO_RESULTS") {
      return ["No transit routes found between those locations. Try being more specific with the addresses."];
    }
    if (data.status !== "OK") {
      Logger.log("Maps API error: " + data.status + " - " + (data.error_message || ""));
      return ["Directions error: " + data.status + ". Check your API key and billing settings."];
    }

    return formatDirections(data);

  } catch (err) {
    Logger.log("Fetch error: " + err);
    return ["Error fetching directions. Please try again."];
  }
}

// ── FORMAT DIRECTIONS ────────────────────────────────────────
function formatDirections(data) {
  var leg = data.routes[0].legs[0];
  var messages = [];

  // Route summary
  messages.push(
    leg.start_address + " -> " + leg.end_address + "\n" +
    "Duration: " + leg.duration.text +
    " | Distance: " + leg.distance.text +
    "\nDepart: " + leg.departure_time.text +
    " | Arrive: " + leg.arrival_time.text
  );

  // One message per step
  leg.steps.forEach(function(step, i) {
    var msg = "Step " + (i + 1) + "\n";

    if (step.travel_mode === "WALKING") {
      msg +=
        "Walk " + step.distance.text +
        " (" + step.duration.text + ")";
    }

    else if (step.travel_mode === "TRANSIT") {
      var t = step.transit_details;

      msg +=
        "Take " + (t.line.short_name || t.line.name) +
        "\nFrom: " + t.departure_stop.name +
        "\nTo: " + t.arrival_stop.name +
        "\nStops: " + t.num_stops;
    }

    messages.push(msg);
  });

  messages.push("Arrive at: " + leg.end_address);

  return messages;
}

// ── PACK LINES INTO GROUPME-SAFE MESSAGES ───────────────────
var MAX_CHARS = 975;

// ── HELPERS ──────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ── GROUPME SEND ─────────────────────────────────────────────
function sendText(text) {
  var payload = JSON.stringify({ bot_id: BOT_ID, text: text });
  UrlFetchApp.fetch("https://api.groupme.com/v3/bots/post", {
    method:  "post",
    payload: payload,
    headers: { "Content-Type": "application/json" },
    muteHttpExceptions: true
  });
}