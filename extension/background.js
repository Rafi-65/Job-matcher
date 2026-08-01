import { getResume, getConfig } from "./shared/storage.js";
import { buildPrompt, parseModelResponse } from "./shared/prompt.js";
import { callModel, effectiveBaseUrl } from "./adapters/providers.js";
import { hasOriginPermission } from "./shared/permissions.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "ANALYZE") return false;

  (async () => {
    try {
      const [resume, config] = await Promise.all([getResume(), getConfig()]);

      if (!resume?.text) {
        throw new Error("No resume saved yet. Open JobMatcher options and upload your resume.");
      }
      if (!config?.provider) {
        throw new Error("No AI model configured yet. Open JobMatcher options and set one up.");
      }
      if (!(await hasOriginPermission(effectiveBaseUrl(config)))) {
        throw new Error("JobMatcher no longer has permission to contact your model endpoint. Re-save your settings in options to re-grant it.");
      }

      const prompt = buildPrompt(resume.text, message.jobText);
      const raw = await callModel(config, prompt);
      const result = parseModelResponse(raw);
      sendResponse({ ok: true, result });
    } catch (err) {
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();

  return true; // keep the message channel open for the async sendResponse
});
