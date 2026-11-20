const $ = (id) => document.getElementById(id);

const apiKeyInput = $("apiKey");
const chatBox = $("chat");
const messageInput = $("messageInput");
const sendButton = $("sendButton");

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

const KEY_NAME = "jarvis_gemini_key";
const HISTORY_NAME = "jarvis_chat_history";

let conversation = [];
let busy = false;

// Load saved settings and conversation
try {
  apiKeyInput.value = localStorage.getItem(KEY_NAME) || "";
  conversation = JSON.parse(
    localStorage.getItem(HISTORY_NAME) || "[]"
  );

  if (!Array.isArray(conversation)) conversation = [];
} catch {
  conversation = [];
}

function setStatus(id, message, good = false) {
  const element = $(id);
  element.textContent = message;
  element.className = good ? "online" : "";
}

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = "message " + sender;

  const label = document.createElement("span");
  label.className = "sender";
  label.textContent =
    sender === "user" ? "YOU" : "J.A.R.V.I.S";

  const content = document.createElement("div");
  content.textContent = text;

  message.append(label, content);
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function saveHistory() {
  try {
    conversation = conversation.slice(-16);
    localStorage.setItem(
      HISTORY_NAME,
      JSON.stringify(conversation)
    );
  } catch {
    $("activity").textContent = "MEMORY STORAGE UNAVAILABLE";
  }
}

function showSavedConversation() {
  chatBox.innerHTML = "";

  if (conversation.length === 0) {
    addMessage(
      "Hello! I am ready. Save your Gemini API key to connect my AI brain.",
      "bot"
    );
    return;
  }

  conversation.forEach(item => {
    const text = item.parts?.[0]?.text || "";
    addMessage(text, item.role === "user" ? "user" : "bot");
  });
}

showSavedConversation();

// Save API key only in this browser on this device
$("saveKey").addEventListener("click", () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    $("keyMessage").textContent = "Please enter your API key.";
    return;
  }

  try {
    localStorage.setItem(KEY_NAME, key);
    $("keyMessage").textContent = "API key saved on this device.";
    setStatus("brainStatus", "KEY SAVED", true);
  } catch {
    $("keyMessage").textContent = "Could not save the key.";
  }
});

$("removeKey").addEventListener("click", () => {
  localStorage.removeItem(KEY_NAME);
  apiKeyInput.value = "";
  $("keyMessage").textContent = "API key removed.";
  setStatus("brainStatus", "NOT CONNECTED");
});

$("toggleKey").addEventListener("click", () => {
  const hidden = apiKeyInput.type === "password";
  apiKeyInput.type = hidden ? "text" : "password";
  $("toggleKey").textContent = hidden ? "HIDE" : "SHOW";
});

// Test connection using a real Gemini request
async function sendMessage() {
  const text = messageInput.value.trim();

  if (!text || busy) return;

  const apiKey = localStorage.getItem(KEY_NAME);

  if (!apiKey) {
    addMessage(
      "Please save your Gemini API key in the AI CONNECTION section first.",
      "bot"
    );
    $("activity").textContent = "API KEY REQUIRED";
    return;
  }

  busy = true;
  sendButton.disabled = true;
  sendButton.textContent = "...";

  messageInput.value = "";
  addMessage(text, "user");

  conversation.push({
    role: "user",
    parts: [{ text }]
  });

  $("activity").textContent = "J.A.R.V.I.S IS THINKING...";
  setStatus("brainStatus", "CONNECTING");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              "You are J.A.R.V.I.S, a helpful, intelligent, polite " +
              "personal AI assistant. Give clear and accurate answers. " +
              "Never claim to control a device or perform an action " +
              "unless an actual tool has done it."
          }]
        },
        contents: conversation.slice(-16),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorText =
        data.error?.message || "Gemini API request failed.";

      throw new Error(
        "HTTP " + response.status + ": " + errorText
      );
    }

    const answer =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      throw new Error("Gemini returned an empty response.");
    }

    conversation.push({
      role: "model",
      parts: [{ text: answer }]
    });

    saveHistory();
    addMessage(answer, "bot");

    setStatus("brainStatus", "ONLINE", true);
    $("activity").textContent = "RESPONSE RECEIVED";

  } catch (error) {
    console.error("JARVIS error:", error);

    // Remove the unanswered user message from stored history
    conversation.pop();
    saveHistory();

    addMessage("Connection error: " + error.message, "bot");
    setStatus("brainStatus", "ERROR");
    $("activity").textContent = "CONNECTION FAILED";

  } finally {
    busy = false;
    sendButton.disabled = false;
    sendButton.textContent = "SEND";
    messageInput.focus();
  }
}

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

// Clear conversation memory
$("clearChat").addEventListener("click", () => {
  conversation = [];
  localStorage.removeItem(HISTORY_NAME);
  showSavedConversation();
  $("activity").textContent = "CHAT MEMORY CLEARED";
});

// Network status
function updateNetwork() {
  setStatus(
    "networkStatus",
    navigator.onLine ? "ONLINE" : "OFFLINE",
    navigator.onLine
  );
}

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);
updateNetwork();

// Voice input, when supported by the browser
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  setStatus("voiceStatus", "AVAILABLE", true);

  $("voiceButton").addEventListener("click", () => {
    try {
      recognition.start();
    } catch {
      $("activity").textContent =
        "VOICE IS ALREADY LISTENING";
    }
  });

  recognition.onstart = () => {
    $("voiceButton").classList.add("listening");
    $("activity").textContent = "LISTENING...";
  };

  recognition.onresult = event => {
    messageInput.value =
      event.results[0][0].transcript;
    sendMessage();
  };

  recognition.onerror = event => {
    $("activity").textContent =
      "VOICE ERROR: " + event.error;
  };

  recognition.onend = () => {
    $("voiceButton").classList.remove("listening");
  };

} else {
  setStatus("voiceStatus", "NOT SUPPORTED");
}

