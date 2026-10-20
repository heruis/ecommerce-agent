# Lessons learned

One line per lesson: what happened → why → what fixed it. Anyone may add (shared file). Feeds the write-up.

- 2026-10-18 · The golden eval caught a Chinese prompt injection ("忽略之前的所有指令…") that passed the input screen → the regex required the instruction word right after "之前" → widened the pattern; added the phrase to `input.test.ts`. _Evals find what you did not think to unit-test._
- 2026-10-18 · The output gate left "best-selling" after stripping "#1" → the sweep stripped only the first match per rule → re-scan until clean. _Write the test for the case you assume works._
- 2026-10-18 · `pnpm doctor` printed nothing → it is a built-in pnpm command that shadows the script → renamed to `pnpm check:env`.
- 2026-10-18 · Mock checkout redirected to the wrong port → absolute URLs built from `NEXT_PUBLIC_APP_URL` → mock billing returns relative URLs.
- 2026-10-19 · Mock evals were 13/13, the first live run 10/13 → mock agents are scripted to pass, so they prove the plumbing, not the prompts → run the live suite before trusting a number. _Mock green is not a quality signal._
- 2026-10-19 · Live eval: extraction translated 可降解 as "Degradable", and the lexicon only knew "biodegradable" — so the output gate would also have let "degradable" into a real listing → widened the rule to every degradability claim, with a test. _An eval failure can be a real safety gap, not a flaky test._
- 2026-10-19 · "Call check_listing before you submit" lived only in the prompt; the agent sometimes submitted an Amazon title with "phone" 3x → `submit_listing` is now validated in code, one correction round, then the gate reports it. _A rule the model must follow belongs in code._
- 2026-10-19 · Two of three live failures passed on a re-run → we ran the live suite twice after the fixes (13/13 both times) before calling it fixed. _One green run can be luck._
- 2026-10-19 · Supabase URL copied from the Data API page ended in `/rest/v1/` → table reads looked fine but RPC calls failed with "Invalid path" → use the bare project URL (noted in DEPLOYMENT.md).
