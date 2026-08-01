// Injected on demand (via chrome.scripting.executeScript) when the user clicks
// "Analyze this page" in the popup. Works on any site: no LinkedIn/Indeed-specific
// selectors, just a heuristic for "the biggest block of readable text on the page."
(function extractJobText() {
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "NAV", "FOOTER", "HEADER", "SVG", "IFRAME"]);

  function visibleText(el) {
    if (!el || SKIP_TAGS.has(el.tagName)) return "";
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return "";
    return el.innerText || "";
  }

  // Candidate containers: prefer <main>/<article>, else the element with the
  // most text among body's descendants at a shallow depth.
  const explicit = document.querySelector("main, article, [role='main']");
  let bestText = explicit ? visibleText(explicit) : "";

  if (!bestText || bestText.trim().length < 200) {
    let best = { el: document.body, len: 0 };
    const candidates = document.body.querySelectorAll("div, section, article");
    candidates.forEach((el) => {
      const text = visibleText(el);
      if (text.length > best.len) best = { el, len: text.length };
    });
    bestText = visibleText(best.el);
  }

  const text = (bestText || document.body.innerText || "").trim().slice(0, 12000);
  return { url: location.href, title: document.title, text };
})();
