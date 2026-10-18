# Lessons learned

One line per lesson: what happened → why → what fixed it. Anyone may add (shared file). Feeds the write-up.

- 2026-10-18 · The golden eval caught a Chinese prompt injection ("忽略之前的所有指令…") that passed the input screen → the regex required the instruction word right after "之前" → widened the pattern; added the phrase to `input.test.ts`. _Evals find what you did not think to unit-test._
- 2026-10-18 · The output gate left "best-selling" after stripping "#1" → the sweep stripped only the first match per rule → re-scan until clean. _Write the test for the case you assume works._
- 2026-10-18 · `pnpm doctor` printed nothing → it is a built-in pnpm command that shadows the script → renamed to `pnpm check:env`.
- 2026-10-18 · Mock checkout redirected to the wrong port → absolute URLs built from `NEXT_PUBLIC_APP_URL` → mock billing returns relative URLs.
