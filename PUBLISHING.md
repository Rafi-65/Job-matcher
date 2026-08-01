# Publishing JobMatcher to the Chrome Web Store

Follow these steps in order. Total active time ~1 hour; review wait is usually
1–3 days (sometimes up to a couple of weeks for first submissions).

## Step 0 — Test locally first (do not skip)
1. Open `chrome://extensions`, toggle **Developer mode** (top right).
2. Click **Load unpacked** → select the `extension/` folder.
3. Open the extension's **Options**: upload your resume (PDF and DOCX), save.
4. Enter a provider + API key (or Ollama), click **Send test prompt** — accept
   the permission dialog Chrome shows; you should see "Success — sample score".
5. Go to any job posting page, click the JobMatcher icon → **Analyze this page**.
6. Fix anything broken before submitting — a reviewer will click these same buttons.

## Step 1 — Create a developer account (one-time)
1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to own the extension
   (consider a dedicated account rather than your personal one).
3. Pay the **one-time $5 USD registration fee** and accept the developer agreement.

## Step 2 — Prepare the assets
Already in this repo:
- `jobmatcher-0.1.0.zip` — the upload package (contents of `extension/`).
- `store-assets-icon-preview-512.png` — the icon at large size (for reference;
  the store-listing icon field uses the 128px one, which is inside the zip).

Still needed from you (the store requires them):
- **1–5 screenshots, exactly 1280×800 or 640×400 PNG/JPG.** Take them of the
  real thing: the popup showing an analysis result on a job page, and the
  options page. On a Mac: ⇧⌘4, drag a region, then resize/pad the capture to
  1280×800 in Preview (Tools → Adjust Size / Canvas). Don't include any real
  API key in the shot — blank the field first.
- Optional but nice: **small promo tile 440×280** (shows up in some store surfaces).

## Step 3 — Upload and fill in the listing
1. In the dev console click **+ New item** → upload `jobmatcher-0.1.0.zip`.
2. **Store listing tab:**
   - Name: JobMatcher
   - Summary (132 chars max), suggestion:
     "Score how well your resume matches any job posting, using your own AI — Claude, GPT, Gemini, local Ollama, or any custom endpoint."
   - Description, suggestion:
     "JobMatcher reads the job posting on your current page and compares it
     against your resume, giving you a 0–100 fit score, the requirements you
     match, the gaps you're missing, and one actionable tip — before you spend
     time applying.

     Bring your own AI: use an API key for Claude, GPT, or Gemini, point it at
     any OpenAI-compatible endpoint (Grok, NVIDIA NIM, Together, LM Studio,
     vLLM), or run fully local and free with Ollama. Your resume and API key
     are stored only in your browser and are sent only to the AI endpoint YOU
     configure — there is no middleman server."
   - Category: **Productivity** (subcategory: workflow/tools if offered).
   - Language: English. Upload the screenshots; the icon is taken from the zip.
3. **Privacy tab** (this is what reviewers scrutinize — answer exactly):
   - **Single purpose description:** "Compares the user's resume against the
     job posting on the current page and reports a match score, matched
     skills, and gaps."
   - **Permission justifications:**
     - `storage` — "Stores the user's resume text and AI provider settings locally."
     - `activeTab` — "Reads the text of the job posting on the current tab, only when the user clicks Analyze."
     - `scripting` — "Injects the text-extraction script into the current tab when the user clicks Analyze."
     - `optional_host_permissions` (http/https) — "Requested at configuration
       time for ONLY the single origin of the AI endpoint the user chooses
       (e.g. api.anthropic.com, or localhost for a local model). The extension
       cannot know this origin in advance because the user brings their own
       provider; no hosts are accessed by default."
   - **Remote code:** No, extension does not use remote code (pdf.js and
     mammoth are bundled inside the package).
   - **Data usage:** check "Personally identifiable information" (a resume
     contains name/contact info) and "Website content" (job posting text).
     Declare that data is sent only to the user-configured AI provider, is not
     sold, not used for unrelated purposes, and not transferred for
     creditworthiness/lending. Certify the disclosures.
   - **Privacy policy URL:** required because the extension handles PII. A
     one-page policy hosted anywhere public works (GitHub Pages / a gist /
     your site). It should state: what data is processed (resume text, job
     page text, API key), where it is stored (locally in the browser), where
     it is sent (only the user-configured AI endpoint), and that you (the
     developer) never receive any of it.
4. **Distribution tab:** Public (or Unlisted if you only want link-sharing
   while you polish it — you can flip to Public later without re-review of the
   listing itself).
5. Click **Submit for review**.

## Step 4 — After submission
- Status appears in the dev console; you'll get an email on approval/rejection.
- If rejected, the email cites the policy section — the usual suspects are
  missing privacy policy, vague single-purpose text, or unjustified
  permissions. All three are pre-answered above; adjust and resubmit (no new fee).
- To ship an update later: bump `"version"` in `manifest.json`, rebuild the zip
  (`cd extension && zip -r ../jobmatcher-<v>.zip . -x "*.DS_Store"`), upload in
  the **Package** tab, submit. Users get it automatically within hours.

## Rebuilding icons
`$CLAUDE_JOB_DIR` scripts are temporary; the icon generator was a one-off
Python script (pure-stdlib SDF renderer). If you want to tweak the design
later, ask Claude to regenerate — the design is: teal gradient rounded square
(#14b8a6 → #0f766e), white briefcase, dark-teal check badge (badge omitted at
16px for legibility).
