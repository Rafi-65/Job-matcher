// Builds the model-agnostic prompt used for every provider. We ask for strict
// JSON back so the parsing logic doesn't need to special-case each model's
// natural-language quirks.

export const RESPONSE_SCHEMA_HINT = `{
  "score": <integer 0-100, overall fit>,
  "summary": "<2-3 sentence plain-language verdict>",
  "matchedSkills": ["<skill/requirement the resume satisfies>", ...],
  "gaps": ["<skill/requirement the resume is missing or weak on>", ...],
  "recommendation": "<one short actionable tip for this specific application>"
}`;

export function buildPrompt(resumeText, jobText) {
  return `You are a career-advisor assistant embedded in a browser extension called JobMatcher. Compare the candidate's resume against the job posting below and judge fit honestly — do not inflate the score to be encouraging.

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
${RESPONSE_SCHEMA_HINT}

RESUME:
"""
${resumeText}
"""

JOB POSTING:
"""
${jobText}
"""`;
}

// Models occasionally wrap JSON in prose or code fences despite instructions.
// This pulls out the first well-formed JSON object it can find.
export function parseModelResponse(rawText) {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : rawText;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain JSON: " + rawText.slice(0, 200));
  }
  const jsonSlice = candidate.slice(start, end + 1);
  const parsed = JSON.parse(jsonSlice);
  return {
    score: Number(parsed.score) || 0,
    summary: String(parsed.summary || ""),
    matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    recommendation: String(parsed.recommendation || ""),
  };
}
