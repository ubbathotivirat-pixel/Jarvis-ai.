
const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL = "gemini-3.8-flash";
const KEY_NAME = "jarvis_gemini_api_key";

const apiKey = document.getElementById("apiKey");
const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");

function status(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message;
}

function getKey() {
  return localStorage.getItem(KEY_NAME) || "";
}

function addMessage(sender, message) {
  const p = document.createElement("p");
  p.textContent = sender + ": " + message;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight;
}

async function askGemini(prompt) {
  const key = getKey();

  if (!key) {
    throw new Error("Please save your Gemini API key first.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
      "Api-Revision": "2026-05-20"
    },
    body: JSON.stringify({
      model: MODEL,
      input: "You are J.A.R.V.I.S, a helpful personal AI assistant. Reply clearly and naturally. User says: " + prompt,
      store: false
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini connection failed.");
  }

  if (data.output_text) return data.output_text;

  const output = (data.steps || [])
    .filter(step => step.type === "model_output")
    .flatMap(step => step.content || [])
    .filter(item => item.type === "text")
    .map(item => item.text)
    .join("");

  if (!output) {
    throw new Error("Gemini returned no text response.");
  }

  return output;
}

// SAVE API KEY
document.getElementById("saveKey").addEventListener("click", async () => {
  const key = apiKey.value.trim();

  if (!key) {
    status("keyMessage", "Please enter your API key.");
    return;
  }

  localStorage.setItem(KEY_NAME, key);
  status("keyMessage", "Testing Gemini connection...");
  await testConnection();
});

// REMOVE API KEY
document.getElementById("removeKey").addEventListener("click", () => {
  localStorage.removeItem(KEY_NAME);
  apiKey.value = "";
  status("keyMessage", "API key removed.");
  status("brainStatus", "AI BRAIN: NOT CONNECTED");
});

// SHOW / HIDE KEY
document.getElementById("toggleKey").addEventListener("click", () => {
  apiKey.type = apiKey.type === "password" ? "text" : "password";
});

// TEST CONNECTION
async function testConnection() {
  try {
    status("brainStatus", "AI BRAIN: CONNECTING");

    const answer = await askGemini("Reply only: JARVIS ONLINE.");

    status("brainStatus", "AI BRAIN: CONNECTED");
    status("keyMessage", "SUCCESS: " + answer);

  } catch (error) {
    status("brainStatus", "AI BRAIN: NOT CONNECTED");
    status("keyMessage", "ERROR: " + error.message);
  }
}

// SEND MESSAGE
async function sendMessage() {
  const prompt = messageInput.value.trim();

  if (!prompt) return;

  messageInput.value = "";
  addMessage("YOU", prompt);
  status("activity", "JARVIS IS THINKING...");

  try {
    const answer = await askGemini(prompt);
    addMessage("J.A.R.V.I.S", answer);
    status("activity", "SYSTEM READY");

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(answer);
      speechSynthesis.speak(speech);
    }

  } catch (error) {
    addMessage("ERROR", error.message);
    status("activity", "CONNECTION ERROR");
  }
}

document.getElementById("sendButton")
  .addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") sendMessage();
});

// CLEAR CHAT
document.getElementById("clearChat").addEventListener("click", () => {
  chat.innerHTML = "";
});

// VOICE INPUT
document.getElementById("voiceButton").addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    addMessage("J.A.R.V.I.S", "Voice recognition is not supported here.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.start();

  recognition.onresult = event => {
    messageInput.value = event.results[0][0].transcript;
    sendMessage();
  };

  recognition.onerror = () => {
    status("activity", "VOICE RECOGNITION ERROR");
  };
});

// STARTUP
apiKey.value = getKey();

status("networkStatus", navigator.onLine
  ? "NETWORK: ONLINE"
  : "NETWORK: OFFLINE");

if (getKey()) {
  testConnection();
} else {
  status("brainStatus", "AI BRAIN: NOT CONNECTED");
}
