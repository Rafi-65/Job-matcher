// Model-agnostic adapter layer. Every provider is reduced to the same shape:
// callModel(config, prompt) -> raw text response.
// `config` = { provider, apiKey, baseUrl, model }
//
// "openai-compatible" is the escape hatch: NVIDIA NIM, xAI Grok, Together,
// Groq, LM Studio, vLLM, and Ollama's own /v1 endpoint all speak the OpenAI
// chat-completions wire format, so one adapter covers all of them — the user
// just points baseUrl at whichever host they want.

const DEFAULTS = {
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-opus-4-5-20251101" },
  openai: { baseUrl: "https://api.openai.com", model: "gpt-5" },
  // gemini-2.5-flash, NOT -pro: the pro model has ~no free-tier quota and
  // instantly 429s on free AI Studio keys.
  gemini: { baseUrl: "https://generativelanguage.googleapis.com", model: "gemini-2.5-flash" },
  // Groq's OpenAI-compatible API is rooted at /openai (path becomes /openai/v1/chat/completions).
  groq: { baseUrl: "https://api.groq.com/openai", model: "llama-3.3-70b-versatile" },
  "openai-compatible": { baseUrl: "http://localhost:8000", model: "" },
  ollama: { baseUrl: "http://localhost:11434", model: "llama3.1" },
};

export function defaultsFor(provider) {
  return DEFAULTS[provider] || { baseUrl: "", model: "" };
}

// The URL actually contacted for a given config, accounting for blank
// baseUrl falling back to the provider default. Used for permission checks.
export function effectiveBaseUrl(config) {
  return config.baseUrl || defaultsFor(config.provider).baseUrl;
}

export async function callModel(config, prompt) {
  const { provider } = config;
  switch (provider) {
    case "anthropic":
      return callAnthropic(config, prompt);
    case "openai":
    case "groq":
      return callOpenAiCompatible({ ...config, baseUrl: config.baseUrl || DEFAULTS[provider].baseUrl }, prompt);
    case "openai-compatible":
      return callOpenAiCompatible(config, prompt);
    case "gemini":
      return callGemini(config, prompt);
    case "ollama":
      return callOllamaNative(config, prompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callAnthropic({ apiKey, baseUrl, model }, prompt) {
  const url = `${trimSlash(baseUrl || DEFAULTS.anthropic.baseUrl)}/v1/messages`;
  const res = await doFetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || DEFAULTS.anthropic.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await expectOk(res);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic response missing content text");
  return text;
}

// Users paste base URLs at every depth: "https://api.groq.com/openai",
// ".../openai/v1", or even the full ".../v1/chat/completions". Normalize all
// three instead of blindly appending (which produced /v1/v1/... 404s).
function chatCompletionsUrl(baseUrl) {
  const base = trimSlash(baseUrl);
  if (base.endsWith("/chat/completions")) return base;
  if (/\/v\d+[a-z]*$/i.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

async function callOpenAiCompatible({ apiKey, baseUrl, model }, prompt) {
  const url = chatCompletionsUrl(baseUrl);
  const res = await doFetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  const data = await expectOk(res);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI-compatible response missing choices[0].message.content");
  return text;
}

async function callGemini({ apiKey, baseUrl, model }, prompt) {
  const m = model || DEFAULTS.gemini.model;
  const url = `${trimSlash(baseUrl || DEFAULTS.gemini.baseUrl)}/v1beta/models/${encodeURIComponent(m)}:generateContent`;
  const res = await doFetch(url, {
    method: "POST",
    // Key goes in a header, not the query string — URLs end up in server/proxy
    // logs and browser history; headers don't.
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  const data = await expectOk(res);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response missing candidates[0].content.parts[0].text");
  return text;
}

async function callOllamaNative({ baseUrl, model }, prompt) {
  const url = `${trimSlash(baseUrl || DEFAULTS.ollama.baseUrl)}/api/chat`;
  const res = await doFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: model || DEFAULTS.ollama.model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  });
  const data = await expectOk(res);
  const text = data?.message?.content;
  if (!text) throw new Error("Ollama response missing message.content");
  return text;
}

// fetch() that turns the browser's opaque "TypeError: Failed to fetch" into
// something the user can act on. That error means the request never reached
// the server: endpoint down/unreachable, origin permission missing, or the
// server rejected the extension's Origin header (Ollama does this by default).
async function doFetch(url, init) {
  try {
    return await fetch(url, init);
  } catch (err) {
    const host = new URL(url).host;
    const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host);
    const hints = [
      `Could not reach ${host} — the request was blocked before reaching the server.`,
      isLocal
        ? `Check the local server is running (e.g. try opening ${new URL(url).origin} in a tab). If this is Ollama, it blocks browser extensions by default — quit Ollama, run: launchctl setenv OLLAMA_ORIGINS "chrome-extension://*" (macOS) or set the OLLAMA_ORIGINS=chrome-extension://* environment variable, then restart Ollama.`
        : `Re-save your settings in JobMatcher options to (re-)grant permission for this endpoint, and check the base URL for typos.`,
    ];
    throw new Error(hints.join(" "));
  }
}

async function expectOk(res) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error(
        `Rate/quota limit from the provider (429). If this is a free Gemini key: the "pro" models have almost no free-tier quota — switch the model to gemini-2.5-flash. Otherwise wait a minute and retry. Details: ${body.slice(0, 200)}`
      );
    }
    if (res.status === 403 && body.toLowerCase().includes("origin")) {
      throw new Error(
        `The server refused the extension's origin (403). If this is Ollama, set OLLAMA_ORIGINS="chrome-extension://*" and restart it. Details: ${body.slice(0, 200)}`
      );
    }
    throw new Error(`Request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

function trimSlash(url) {
  return (url || "").replace(/\/+$/, "");
}
