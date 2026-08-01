import { getResume, setResume, getConfig, setConfig } from "../shared/storage.js";
import { buildPrompt, parseModelResponse } from "../shared/prompt.js";
import { callModel, defaultsFor, effectiveBaseUrl } from "../adapters/providers.js";
import { requestOriginPermission } from "../shared/permissions.js";
import * as pdfjsLib from "../lib/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.min.mjs");

const resumeFile = document.getElementById("resumeFile");
const resumeText = document.getElementById("resumeText");
const resumeStatus = document.getElementById("resumeStatus");
const saveResumeBtn = document.getElementById("saveResume");

const providerSelect = document.getElementById("provider");
const baseUrlInput = document.getElementById("baseUrl");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const configStatus = document.getElementById("configStatus");
const saveConfigBtn = document.getElementById("saveConfig");
const testConfigBtn = document.getElementById("testConfig");
const ollamaHint = document.getElementById("ollamaHint");

init();

async function init() {
  const resume = await getResume();
  if (resume?.text) {
    resumeText.value = resume.text;
    resumeStatus.textContent = `Loaded saved resume (${resume.fileName || "pasted text"}).`;
  }

  const config = await getConfig();
  if (config) {
    providerSelect.value = config.provider;
    baseUrlInput.value = config.baseUrl || "";
    apiKeyInput.value = config.apiKey || "";
    modelInput.value = config.model || "";
    ollamaHint.hidden = config.provider !== "ollama";
  } else {
    applyProviderDefaults();
  }
}

providerSelect.addEventListener("change", applyProviderDefaults);

function applyProviderDefaults() {
  const d = defaultsFor(providerSelect.value);
  baseUrlInput.value = d.baseUrl;
  modelInput.value = d.model;
  ollamaHint.hidden = providerSelect.value !== "ollama";
}

resumeFile.addEventListener("change", async () => {
  const file = resumeFile.files?.[0];
  if (!file) return;

  resumeStatus.textContent = "Parsing…";
  try {
    const text = await extractText(file);
    resumeText.value = text;
    resumeStatus.textContent = `Extracted ${text.length.toLocaleString()} characters from ${file.name}. Review, then click Save.`;
  } catch (err) {
    resumeStatus.textContent = `Failed to parse ${file.name}: ${err.message || err}`;
  }
});

async function extractText(file) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const buffer = await file.arrayBuffer();

  if (isPdf) {
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return text.trim();
  }

  // .docx
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}

saveResumeBtn.addEventListener("click", async () => {
  const text = resumeText.value.trim();
  if (!text) {
    resumeStatus.textContent = "Nothing to save — paste or upload a resume first.";
    return;
  }
  await setResume({ text, fileName: resumeFile.files?.[0]?.name, savedAt: Date.now() });
  resumeStatus.textContent = "Resume saved.";
});

function readConfigFromForm() {
  return {
    provider: providerSelect.value,
    baseUrl: baseUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
  };
}

// The extension ships with no host permissions; ask for just this endpoint's
// origin at save time (must happen inside the click handler = user gesture).
async function ensureEndpointAccess(config) {
  const granted = await requestOriginPermission(effectiveBaseUrl(config));
  if (!granted) {
    throw new Error("Permission to contact this endpoint was declined — JobMatcher can't call the model without it.");
  }
}

saveConfigBtn.addEventListener("click", async () => {
  try {
    const config = readConfigFromForm();
    await ensureEndpointAccess(config);
    await setConfig(config);
    configStatus.textContent = "Model settings saved.";
  } catch (err) {
    configStatus.textContent = err.message || String(err);
  }
});

testConfigBtn.addEventListener("click", async () => {
  configStatus.textContent = "Sending test prompt…";
  try {
    const config = readConfigFromForm();
    await ensureEndpointAccess(config);
    const prompt = buildPrompt(
      "Software engineer with 5 years of experience in JavaScript, React, and Node.js.",
      "Looking for a frontend engineer skilled in React and TypeScript."
    );
    const raw = await callModel(config, prompt);
    const result = parseModelResponse(raw);
    configStatus.textContent = `Success — sample score: ${result.score}. Connection works.`;
  } catch (err) {
    configStatus.textContent = `Test failed: ${err.message || err}`;
  }
});
