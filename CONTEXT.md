# Current Project

## What we are building
JobMatcher — Manifest V3 Chrome extension. On any job-posting page, extracts
visible page text and asks a user-configured AI model to score resume-vs-job
fit (0-100), list matched skills, gaps, and one actionable tip.

**Model-agnostic by design**: user supplies provider + base URL + API key
(optional) + model name in the options page. Supported provider types:
`anthropic`, `openai`, `gemini`, `openai-compatible` (generic escape hatch —
covers Grok/xAI, NVIDIA NIM, Together, LM Studio, vLLM, any OpenAI-wire-format
host), `ollama` (native `/api/chat`). All requests fire directly from the
browser (background service worker) to the provider — no proxy backend.

Resume input: user uploads PDF or DOCX, parsed client-side (pdf.js / mammoth,
vendored locally — MV3 forbids remote code), extracted text is editable then
saved to `chrome.storage.local`.

Target site scope for MVP: **generic — any page**, not site-specific
scraping. `content.js` uses a heuristic (prefer `<main>`/`<article>`, else
largest visible text block) rather than LinkedIn/Indeed selectors.

## Layout
```
extension/
  manifest.json        MV3, permissions: storage/activeTab/scripting; NO install-time host permissions — endpoint origins are optional_host_permissions requested per-origin when the user saves config (shared/permissions.js)
  background.js         service worker; routes ANALYZE message -> adapter -> parsed JSON result
  content.js             injected on demand via chrome.scripting.executeScript, returns {url, title, text}
  adapters/providers.js  callModel(config, prompt) -> raw text; one function per provider
  shared/prompt.js       buildPrompt() + parseModelResponse() (strict-JSON contract, tolerant parsing)
  shared/storage.js      chrome.storage.local helpers for resume + config
  popup/                 popup.html/js/css — gradient header w/ logo + rotating gear btn, analyze button, spinner status, score ring (conic-gradient, color-coded + count-up anim), matched/gap pills, tip callout
  options/                options.html/js/css — card sections w/ numbered steps, dashed file-drop label, provider config, ollama callout, "send test prompt" button
  lib/                   vendored pdf.min.mjs + pdf.worker.min.mjs (pdfjs-dist 4.0.379), mammoth.browser.min.js (mammoth 1.7.0)
  icons/                 real branded icons (16/48/128): teal gradient rounded square, white briefcase, check badge (badge omitted at 16px)
```

## Status
Initial scaffold built end-to-end (2026-07-29): manifest, all 5 providers,
resume parsing, popup + options UI. `node --check` passed on all JS files;
manifest.json validated. **Not yet tested in a live Chrome instance** — no
browser automation available in this session, and no API key / local Ollama
instance was available to exercise a real analysis call. No API keys stored
anywhere in the repo (by design — user enters their own in options page,
stored only in their local chrome.storage).

## What good work looks like
- Keep the provider adapter surface to exactly `callModel(config, prompt) -> string`; don't leak provider-specific response shapes past `adapters/providers.js`.
- Resume/API keys never leave `chrome.storage.local` except in the direct fetch to the provider the user configured.
- Any new provider = one new case in `adapters/providers.js` + one `<option>` in options.html + a `DEFAULTS` entry. Don't add a UI framework or bundler for this.

## What to avoid
- No site-specific scraping logic (LinkedIn/Indeed selectors) — scope decision was explicitly "generic, any page."
- No remote script loading (violates MV3 CSP) — any new client-side library must be vendored into `lib/`.
- Don't commit real API keys anywhere, including test fixtures.

Security review done 2026-07-29: no install-time host permissions (per-origin
optional permission requested on config save, `shared/permissions.js`); Gemini
key moved to `x-goog-api-key` header; all rendering via textContent (no XSS);
API key in chrome.storage.local plaintext (standard, no better browser
primitive). Store package: `jobmatcher-0.1.0.zip` at repo root.

Icons done 2026-07-29 (real branding, see Layout). `store-assets-icon-preview-512.png`
at repo root. Full store-submission walkthrough in **PUBLISHING.md**.

Bugfixes 2026-07-29 (from user's live testing): Gemini default model changed
2.5-pro → 2.5-flash (pro has ~no free-tier quota, instant 429 on free keys);
added `groq` provider preset (its API root is /openai — old blind "+/v1/..."
join built a wrong URL); `chatCompletionsUrl()` now normalizes pasted base
URLs at any depth; "Failed to fetch" and 429/403 errors rewritten into
actionable messages. Ollama requires user-side `OLLAMA_ORIGINS="chrome-extension://*"`
(it rejects extension origins by default) — hint shown in options UI + errors.

## Next steps (not yet done)
- User: load unpacked in `chrome://extensions` and click through both flows (checklist in REFERENCES.md / PUBLISHING.md step 0).
- User: take 1280×800 screenshots, host a privacy-policy page, then follow PUBLISHING.md steps 1–3 to submit.
