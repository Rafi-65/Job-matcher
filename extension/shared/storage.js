// Thin wrapper around chrome.storage.local for the two things JobMatcher persists:
// the user's resume text and their model-provider configuration.

const RESUME_KEY = "jobmatcher_resume";
const CONFIG_KEY = "jobmatcher_config";

export async function getResume() {
  const { [RESUME_KEY]: resume } = await chrome.storage.local.get(RESUME_KEY);
  return resume || null; // { text, fileName, savedAt }
}

export async function setResume(resume) {
  await chrome.storage.local.set({ [RESUME_KEY]: resume });
}

export async function getConfig() {
  const { [CONFIG_KEY]: config } = await chrome.storage.local.get(CONFIG_KEY);
  return config || null; // { provider, apiKey, baseUrl, model }
}

export async function setConfig(config) {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}
