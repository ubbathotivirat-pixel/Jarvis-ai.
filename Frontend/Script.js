const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const send = document.getElementById("send");

const API_KEY = "PASTE_YOUR_REAL_API_KEY";
const MODEL = "gemini-3.8-flash";

function add(text, who) {
    const d = document.createElement("div");
    d.className = "msg " + who;
    d.textContent = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
}

async function askGemini(question) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
            contents: [{
                role: "user",
                parts: [{ text: question }]
            }]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}: ` +
            (data.error?.message || "Unknown API error")
        );
    }

    const answer =
        data.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("");

    if (!answer) {
        throw new Error("Gemini returned no text response.");
    }

    return answer;
}

async function sendMessage() {
    const question = input.value.trim();

    if (!question) return;

    if (!API_KEY || API_KEY === "PASTE_YOUR_REAL_API_KEY") {
        add("JARVIS: Gemini API key is missing.", "ai");
        return;
    }

    add("YOU: " + question, "user");
    input.value = "";
    send.disabled = true;

    const loading = add("JARVIS: Connecting to brain...", "ai");

    try {
        const answer = await askGemini(question);
        loading.textContent = "JARVIS: " + answer;
    } catch (error) {
        loading.textContent = "JARVIS ERROR: " + error.message;
        console.error(error);
    } finally {
        send.disabled = false;
    }
}

send.addEventListener("click", sendMessage);

input.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});
