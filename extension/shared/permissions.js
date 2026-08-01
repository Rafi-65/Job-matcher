// Optional-host-permission helpers. The extension ships with NO host
// permissions; when the user saves a provider config we request access to just
// that one origin. Match patterns ignore ports, so "http://localhost/*" also
// covers http://localhost:11434 (Ollama) etc.

export function originPatternFor(baseUrl) {
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol in base URL: ${url.protocol}`);
  }
  return `${url.protocol}//${url.hostname}/*`;
}

// Must be called from a user gesture (button click). Returns true if granted.
export async function requestOriginPermission(baseUrl) {
  return chrome.permissions.request({ origins: [originPatternFor(baseUrl)] });
}

export async function hasOriginPermission(baseUrl) {
  return chrome.permissions.contains({ origins: [originPatternFor(baseUrl)] });
}
