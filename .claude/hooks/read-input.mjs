// Read the JSON event Claude Code sends to a hook on stdin.
export async function readHookInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Exit 2 = block. stderr is shown to Claude (tool hooks) or to the user (prompt hooks). */
export function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
