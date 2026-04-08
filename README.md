<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# OM Venture OS

OM Venture OS is a Firebase-backed venture workflow app for founder evidence, assumptions, experiments, signals, readiness, and operating reviews.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies with `npm install`.
2. Create `.env.local` from `.env.example`.
3. Add `OPENAI_API_KEY` if you want the Venture Copilot to use an LLM.
4. Run `npm run dev`.
5. Open [http://localhost:3000](http://localhost:3000).

If no AI key is configured, the new copilot still works using the built-in heuristic analysis engine so the product remains usable during setup.
