/* =====================================
   J.A.R.V.I.S AI - GEMINI CONNECTION
   ===================================== */

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const KEY_NAME = "jarvis_gemini_api_key";

const $ = (id) => document.getElementById(id);

const apiKeyInput = $("apiKey");
const brainStatus = $("brainStatus");
const networkStatus = $("networkStatus");
const voiceStatus = $("voiceStatus");
const keyMessage = $("keyMessage");
const chat = $("chat");
const messageInput = $("messageInput");
const activity = $("activity");

let busy = false;
let conversation = [];

/* STATUS */

function status(element, value, online) {
  if (!element) return;

  element.textContent = value;
  element.classList.toggle("online", online);
  element.classList.toggle("offline", !online);
}

function getKey() {
  return localStorage.getItem(KEY_NAME) || "";
}

function setActivity(value) {
  if (activity) activity.textContent = value;
}

/* CHAT DISPLAY */

function addMessage(message, sender = "bot") {
  const box = document.createElement("div");
  box.className = "message " + sender;

  const name = document.createElement("span");
  name.className = "sender";
  name.textContent =
    sender === "bot" ? "J.A.R.V.I.S" : "YOU";

  const text = document.createElement("div");
  text.textContent = message;

  box.appendChild(name);
  box.appendChild(text);

  chat.appendChild(box);
  chat.scrollTop = chat.scrollHeight;
}

/* GEMINI CONNECTION */

async function askGemini(prompt) {
  const key = getKey();

  if (!key) {
    throw new Error("Please save your Gemini API key.");
  }

  const contents = [
    ...conversation,
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  const response = await fetch(
    API_URL + "?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: "You are J.A.R.V.I.S, a helpful intelligent personal AI assistant. Answer clearly and politely."
          }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Gemini API error " + response.status
    );
  }

  const answer =
    data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

  if (!answer) {
    throw new Error("Gemini returned no text.");
  }

  conversation.push(
    { role: "user", parts: [{ text: prompt }] },
    { role: "model", parts: [{ text: answer }] }
  );

  if (conversation.length > 20) {
    conversation = conversation.slice(-20);
  }

  return answer;
}

/* TEST CONNECTION */

async function testConnection() {
  status(brainStatus, "CONNECTING...", false);
  setActivity("TESTING GEMINI CONNECTION...");

  try {
    await askGemini("Reply with exactly: JARVIS ONLINE");

    conversation = [];

    status(brainStatus, "CONNECTED", true);
    status(networkStatus, "ONLINE", true);

    keyMessage.textContent =
      "API key saved. Gemini connected!";

    setActivity("J.A.R.V.I.S READY");

    return true;

  } catch (error) {
    status(brainStatus, "NOT CONNECTED", false);

    keyMessage.textContent =
      "ERROR: " + error.message;

    setActivity("CONNECTION FAILED");

    return false;
  }
}

/* SAVE KEY */

$("saveKey").addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    keyMessage.textContent = "Enter your Gemini API key.";
    return;
  }

  if (busy) return;

  localStorage.setItem(KEY_NAME, key);

  conversation = [];

  keyMessage.textContent = "Key saved. Testing...";

  await testConnection();
});

/* REMOVE KEY */

$("removeKey").addEventListener("click", () => {
  localStorage.removeItem(KEY_NAME);

  apiKeyInput.value = "";
  conversation = [];

  status(brainStatus, "NOT CONNECTED", false);

  keyMessage.textContent = "API key removed.";

  setActivity("WAITING FOR API KEY");
});

/* SHOW / HIDE KEY */

$("toggleKey").addEventListener("click", () => {
  const hidden = apiKeyInput.type === "password";

  apiKeyInput.type = hidden ? "text" : "password";

  $("toggleKey").textContent = hidden ? "HIDE" : "SHOW";
});

/* SEND MESSAGE */

async function sendMessage() {
  const prompt = messageInput.value.trim();

  if (!prompt || busy) return;

  if (!getKey()) {
    addMessage("Please save your Gemini API key first.");
    return;
  }

  busy = true;

  messageInput.value = "";

  addMessage(prompt, "user");

  $("sendButton").disabled = true;
  $("sendButton").textContent = "WAIT";

  setActivity("J.A.R.V.I.S THINKING...");

  try {
    const answer = await askGemini(prompt);

    addMessage(answer, "bot");

    status(brainStatus, "CONNECTED", true);

    setActivity("RESPONSE RECEIVED");

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(answer);
      speech.lang = "en-IN";

      window.speechSynthesis.speak(speech);
    }

  } catch (error) {
    addMessage("ERROR: " + error.message);

    status(brainStatus, "NOT CONNECTED", false);

    setActivity("COMMAND FAILED");

  } finally {
    busy = false;

    $("sendButton").disabled = false;
    $("sendButton").textContent = "SEND";
  }
}

$("sendButton").addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") sendMessage();
});

/* CLEAR CHAT */

$("clearChat").addEventListener("click", () => {
  chat.innerHTML = "";
  conversation = [];

  addMessage("Chat cleared. I am ready.");

  setActivity("SYSTEM READY");
});

/* VOICE INPUT */

const Recognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (Recognition) {
  const recognition = new Recognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;

  voiceStatus.textContent = "AVAILABLE";

  $("voiceButton").addEventListener("click", () => {
    try {
      recognition.start();
      setActivity("LISTENING...");
    } catch (error) {
      setActivity("VOICE ALREADY ACTIVE");
    }
  });

  recognition.onresult = event => {
    messageInput.value =
      event.results[0][0].transcript;

    sendMessage();
  };

  recognition.onerror = () => {
    setActivity("VOICE INPUT ERROR");
  };

} else {
  voiceStatus.textContent = "UNAVAILABLE";
}

/* STARTUP */

window.addEventListener("load", async () => {
  status(networkStatus, "ONLINE", true);

  if (Recognition && voiceStatus) {
    voiceStatus.textContent = "AVAILABLE";
  } else if (voiceStatus) {
    voiceStatus.textContent = "UNAVAILABLE";
  }

  if (getKey()) {
    apiKeyInput.value = getKey();

    keyMessage.textContent = "Checking saved API key...";

    await testConnection();

  } else {
    status(brainStatus, "NOT CONNECTED", false);

    keyMessage.textContent = "API key not saved yet.";
  }
});
