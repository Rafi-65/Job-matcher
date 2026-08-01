# JobMatcher

**Resume-fit at a glance.** JobMatcher is a Chrome extension that compares your resume against any job posting you're viewing and gives you an instant fit score (0–100), your matched skills, the gaps, and one actionable tip — powered by the AI model of *your* choice.

<p align="center">
  <img src="store-assets-icon-preview-512.png" alt="JobMatcher icon" width="128" />
</p>

## Highlights

- **Model-agnostic — bring your own AI.** Works with Anthropic (Claude), OpenAI (GPT), Google Gemini, Groq, any OpenAI-compatible endpoint (Grok/xAI, NVIDIA NIM, Together, LM Studio, vLLM, …), or fully local models via Ollama.
- **Works on any page.** No site-specific scraping — a generic extractor finds the main job text on LinkedIn, Indeed, company career pages, or anywhere else.
- **Private by design.** Your resume and API key are stored only in your browser (`chrome.storage.local`). Requests go **directly** from your browser to the provider you configure — there is no middleman server, no analytics, no tracking.
- **One-time setup.** Upload your resume (PDF or DOCX, parsed entirely client-side), pick a provider, and you're done. After that it's one click per job posting.

## How it works

1. Open a job posting in any tab.
2. Click the JobMatcher icon → **Analyze this job posting**.
3. The extension extracts the visible job text from the page, combines it with your saved resume, and asks your configured model for a structured assessment.
4. You get:
   - **Fit score** (0–100) on an animated, color-coded ring
   - **Summary** — a two-sentence verdict
   - **Matched skills** — what in your resume lines up with the posting
   - **Gaps** — what the posting wants that your resume doesn't show
   - **Tip** — one concrete recommendation (e.g., what to emphasize in your cover letter)

## Installation

### From source (unpacked)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle, top right).
4. Click **Load unpacked** and select the `extension/` folder.
5. Pin JobMatcher to your toolbar for easy access.

### From the Chrome Web Store

Publishing steps are documented in [PUBLISHING.md](PUBLISHING.md). Once published, install it like any other extension.

## Setup

Click the gear button in the popup (or right-click the icon → **Options**) to open Settings.

### Step 1 — Your resume

Upload a **PDF** or **DOCX**. Text is extracted locally in your browser (via vendored [pdf.js](https://mozilla.github.io/pdf.js/) / [mammoth.js](https://github.com/mwilliamson/mammoth.js) — nothing is uploaded anywhere). Review or edit the extracted text, then **Save resume**.

### Step 2 — Your AI model

Pick a provider; sensible defaults for base URL and model are filled in automatically. Enter your API key if the provider needs one, then **Save model settings**. Use **Send test prompt** to verify everything works before analyzing a real posting.

| Provider | Default base URL | Default model | API key |
|---|---|---|---|
| Anthropic (Claude) | `https://api.anthropic.com` | `claude-opus-4-5-20251101` | Required |
| OpenAI (GPT) | `https://api.openai.com` | `gpt-5` | Required |
| Google Gemini | `https://generativelanguage.googleapis.com` | `gemini-2.5-flash` | Required |
| Groq | `https://api.groq.com/openai` | `llama-3.3-70b-versatile` | Required |
| OpenAI-compatible | `http://localhost:8000` | (yours) | Optional |
| Ollama (local) | `http://localhost:11434` | `llama3.1` | Not needed |

> **Why does it ask for permission when I save?** JobMatcher requests access to *only* the origin of the endpoint you configured, at the moment you save it. It ships with **zero** install-time host permissions.

### Provider notes

- **Gemini free tier:** the `pro` models have effectively no free-tier quota and return an immediate `429`. Use `gemini-2.5-flash` (the default).
- **Groq:** its API root is `https://api.groq.com/openai` — the preset handles this for you.
- **Ollama:** Ollama rejects requests from browser extensions by default. Allow them, then restart Ollama:
  - **macOS:** `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` in Terminal, then quit and reopen Ollama.
  - **Linux/Windows:** set the environment variable `OLLAMA_ORIGINS=chrome-extension://*` for the Ollama service.
- **Anything OpenAI-compatible** (Grok/xAI, NVIDIA NIM, Together, LM Studio, vLLM, self-hosted…): choose *Other OpenAI-compatible*, paste the base URL and model name. The extension normalizes the URL, so `https://host`, `https://host/v1`, and a full `/chat/completions` URL all work.

## Privacy & security

- **Your data stays yours.** Resume text and API key live only in `chrome.storage.local` on your machine. The only network request the extension ever makes is the analysis call to the endpoint *you* configured.
- **No remote code.** All libraries (pdf.js, mammoth.js) are vendored locally, as required by Manifest V3.
- **Least privilege.** Permissions are `storage`, `activeTab`, and `scripting` only. Host access is granted per-origin, optionally, when you save your settings — never `<all_urls>` at install time.
- **XSS-safe rendering.** Model output is rendered with `textContent`, never injected as HTML.

## Architecture

```
extension/
├── manifest.json          # MV3; storage/activeTab/scripting; optional per-origin host permissions
├── background.js          # Service worker — routes ANALYZE messages to the provider adapter
├── content.js             # Injected on demand; extracts the main job text from the page
├── adapters/
│   └── providers.js       # callModel(config, prompt) → text; one case per provider + defaults
├── shared/
│   ├── prompt.js          # Strict-JSON prompt contract + tolerant response parsing
│   ├── storage.js         # chrome.storage.local helpers (resume + config)
│   └── permissions.js     # Per-origin optional permission request/check
├── popup/                 # Toolbar popup — analyze button, score ring, pills, tip
├── options/               # Settings page — resume upload/parse, provider config, test prompt
├── lib/                   # Vendored: pdf.js 4.0.379, mammoth 1.7.0
└── icons/                 # 16 / 48 / 128 px branded icons
```

**Design principles**

- The entire provider surface is one function: `callModel(config, prompt) → string`. Provider-specific request/response shapes never leak past `adapters/providers.js`.
- Adding a provider = one `DEFAULTS` entry + one `case` in `providers.js` + one `<option>` in `options.html`. No framework, no bundler, no build step.
- Page extraction is heuristic (prefer `<main>`/`<article>`, else the largest visible text block), so it works on any site without per-site selectors.

## Development

No build step — edit the files under `extension/` and hit the reload button on `chrome://extensions`.

```bash
# Syntax-check all scripts
find extension -name "*.js" -not -path "*/lib/*" -exec node --check {} \;

# Rebuild the store upload package
cd extension && zip -r ../jobmatcher-0.1.0.zip . -x "*.DS_Store"
```

Useful docs and a manual test checklist live in [REFERENCES.md](REFERENCES.md). Working notes are in [CONTEXT.md](CONTEXT.md).

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Failed to fetch" with Ollama | Set `OLLAMA_ORIGINS="chrome-extension://*"` and restart Ollama (see provider notes). |
| "Failed to fetch" with a remote provider | Host permission not granted — open Settings and re-save your model settings. |
| `429` from Gemini on a fresh account | You're on a `pro` model with no free quota — switch to `gemini-2.5-flash`. |
| "Couldn't find enough job text on this page" | The page has little visible text (e.g., behind a login or in an iframe). Open the posting's full page and try again. |
| Popup shows a raw provider error | The message includes the provider's response body — usually a wrong model name or invalid API key. |

## Contributing

Contributions are welcome! The codebase is deliberately simple — plain JS, no framework, no build step. Good first contributions:

- **Add a provider:** one `DEFAULTS` entry + one `case` in `extension/adapters/providers.js`, plus an `<option>` in `extension/options/options.html`.
- **Improve extraction:** better heuristics in `extension/content.js` (but keep it generic — no site-specific selectors).
- **Translations, accessibility, UI polish.**

Before opening a PR, please run the syntax check and click through the manual test checklist in [REFERENCES.md](REFERENCES.md). Never commit API keys — not even in test fixtures.

## License

Open source under the [MIT License](LICENSE).

Vendored libraries keep their own licenses: [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) and [mammoth.js](https://github.com/mwilliamson/mammoth.js) (BSD-2-Clause).
