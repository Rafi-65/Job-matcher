# References

## Example of Good work

## Relevant links
- pdf.js (vendored, v4.0.379): https://github.com/mozilla/pdf.js
- mammoth.js (vendored, v1.7.0): https://github.com/mwilliamson/mammoth.js
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages
- OpenAI Chat Completions API (shape reused by the `openai-compatible` adapter for Grok/NVIDIA NIM/etc.): https://platform.openai.com/docs/api-reference/chat
- Gemini generateContent API: https://ai.google.dev/api/generate-content
- Ollama API (native, not OpenAI-compat): https://github.com/ollama/ollama/blob/main/docs/api.md

## Manual test checklist (do this in a real Chrome — not runnable from this session)
1. `chrome://extensions` → enable Developer Mode → "Load unpacked" → select the `extension/` folder.
2. Confirm no errors on the extension card; click "service worker" link to open its console and check for load errors.
3. Open Options (right-click icon → Options, or the gear in the popup):
   - Upload a PDF resume, confirm extracted text appears and looks right, edit if needed, Save.
   - Upload a DOCX resume, same check.
   - Pick a provider, fill in API key/model, click "Send test prompt" — confirms the adapter + your key actually work end to end.
4. Open the popup on any job posting page (try a plain job listing, not just LinkedIn, since scope is "generic any page"), click "Analyze this page", confirm score/summary/matched/gaps/tip render.
5. Try a page with very little text (e.g. a search homepage) — should show the "couldn't find enough job text" error, not crash.

## Notes
- MV3 forbids remotely-hosted code, so pdf.js/mammoth are vendored as static files in `extension/lib/` rather than loaded from a CDN.
- Host access uses `optional_host_permissions` + per-origin `chrome.permissions.request` at config-save time, because the model-agnostic requirement means the endpoint (e.g. `http://localhost:11434` for Ollama, or any self-hosted server) can't be predicted at install time. Match patterns ignore ports, so `http://localhost/*` covers any local port.
- Chrome optional permissions docs: https://developer.chrome.com/docs/extensions/reference/api/permissions
- CWS program policies (single purpose, permission justification): https://developer.chrome.com/docs/webstore/program-policies
