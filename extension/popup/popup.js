const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("statusText");
const resultEl = document.getElementById("result");
const scoreRing = document.getElementById("scoreRing");
const scoreValue = document.getElementById("scoreValue");
const summaryEl = document.getElementById("summary");
const matchedSkillsEl = document.getElementById("matchedSkills");
const gapsEl = document.getElementById("gaps");
const recommendationEl = document.getElementById("recommendation");

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

analyzeBtn.addEventListener("click", async () => {
  setStatus("Reading page…");
  resultEl.hidden = true;
  analyzeBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    const { text: jobText } = injection.result || {};
    if (!jobText || jobText.trim().length < 50) {
      throw new Error("Couldn't find enough job text on this page.");
    }

    setStatus("Asking the model…");
    const response = await chrome.runtime.sendMessage({ type: "ANALYZE", jobText });

    if (!response?.ok) {
      throw new Error(response?.error || "Analysis failed.");
    }

    renderResult(response.result);
    setStatus("");
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    analyzeBtn.disabled = false;
  }
});

function setStatus(text, isError = false) {
  statusEl.hidden = !text;
  statusText.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function ringColor(score) {
  if (score >= 70) return "#17a97f"; // green
  if (score >= 40) return "#e0a63c"; // amber
  return "#d66161"; // red
}

function renderResult(result) {
  const score = Math.max(0, Math.min(100, result.score));
  scoreValue.textContent = `${score}`;
  scoreRing.style.setProperty("--ring-color", ringColor(score));
  // brief count-up so the ring visibly fills
  scoreRing.style.setProperty("--pct", 0);
  requestAnimationFrame(() => {
    scoreRing.style.transition = "none";
    let cur = 0;
    const step = () => {
      cur = Math.min(score, cur + Math.max(1, score / 20));
      scoreRing.style.setProperty("--pct", cur);
      if (cur < score) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  summaryEl.textContent = result.summary;
  fillPills(matchedSkillsEl, result.matchedSkills, "good");
  fillPills(gapsEl, result.gaps, "gap");
  recommendationEl.textContent = result.recommendation;
  resultEl.hidden = false;
}

function fillPills(container, items, kind) {
  container.innerHTML = "";
  for (const item of items) {
    const pill = document.createElement("span");
    pill.className = `pill ${kind}`;
    pill.textContent = item;
    container.appendChild(pill);
  }
}
