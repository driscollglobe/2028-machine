# Blocked or waiting on Kevin

Written 2026-11-09 during the unattended run. All 14 build phases were built and opened as PRs. Nothing here stopped a phase. Each item is a decision, an account action, or a check that only Kevin can make.

## Needs a decision
* **Phase 1, What 2028 is about.** You asked to see the current weights before any change. At the default Trump approval of 38 they are: affordability 46.2, AI 20.6, fight 18.0, competence 15.2. Affordability is already the largest share, so nothing was changed. Say whether to raise it further, and to what.
* **Phase 5, the first three calls.** The ledger holds one test row, T1. Type the three calls and I will format them. Test rows are exempt from the lock, so T1 can be deleted.
* **Phase 7, voice rules.** The desk note templates are a draft that follows the anti-ai-writing rules. You review them.
* **Phase 13, methodology prose.** A draft for you to rewrite. The numbers are final for seed 5.

## Needs your account
* **Phase 8, deploy the worker.** The steps are in `worker/README.md`. After deploying, set `CROWD_URL` in index.html. Until then the page never calls the worker.
* **Phase 7, X.** No X secrets exist in the repo. When `X_API_KEY` is added, the job writes draft files only. It never posts.
* **Phase 7, Substack Notes.** There is no official public API. The unofficial endpoints need your browser session, which I would not automate.

## Needs a fact checked
* **Phase 14, citations.** The reporting citations in `backtest-2020/SOURCES.md` were written from memory. Confirm each one and add a link before the backtest runs as a post. Trump approval of 42 for early December 2019 also needs checking against an archived average.
* **Phase 9, automatic delegates.** The 2028 automatic delegate count is not published. The model uses the 2024 ratio (747 to 3,949) until the 2028 Call gives a number.

## Can only be verified after merge
* Phase 6: the approval note updating overnight.
* Phase 7: three consecutive nightly notes reading as different sentences. A three-day demo from history.csv is in PR #11.
* Phase 2: a nightly run writing polls.csv. This works locally.
