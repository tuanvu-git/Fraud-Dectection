/**
 * Convert a Claude Code transcript (.jsonl) into a readable Markdown document.
 *
 *   node scripts/conversation-to-md.mjs [input.jsonl] [output.md]
 *
 * Defaults: output/conversation.jsonl -> AI_CONVERSATION.md
 *
 * Keeps the human/assistant dialogue and the assistant's tool calls; drops the
 * transcript bookkeeping (queue ops, snapshots, attachments, tool results) and the
 * editor noise injected into user turns (<ide_selection>, <system-reminder>, ...).
 */
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2] ?? "output/conversation.jsonl";
const output = process.argv[3] ?? "AI_CONVERSATION.md";

const STRIP_TAGS = ["ide_selection", "ide_opened_file", "ide_diagnostics", "system-reminder"];

/** Internal/plumbing tool calls that add noise, not signal. */
const SKIP_TOOLS = new Set(["ToolSearch"]);

function cleanText(s) {
  let out = s;
  for (const tag of STRIP_TAGS) {
    out = out.replace(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "g"), "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function truncate(s, n = 2000) {
  const t = String(s ?? "");
  return t.length > n ? `${t.slice(0, n)}\n… (${t.length - n} more characters)` : t;
}

/** One-line-ish summary of a tool call's most useful arguments. */
function toolSummary(name, input = {}) {
  const pick = (k) => (input[k] != null ? String(input[k]) : null);
  switch (name) {
    case "ExitPlanMode":
      return "_presented the implementation plan for approval_";
    case "AskUserQuestion": {
      const qs = (input.questions ?? []).map((q) => `  - ${q.question}`).join("\n");
      return `_asked the user:_\n${qs}`;
    }
    case "Write":
      return `\`${pick("file_path")}\``;
    case "Read":
      return `\`${pick("file_path")}\``;
    case "Edit": {
      const old = truncate(input.old_string, 300);
      const neu = truncate(input.new_string, 300);
      return `\`${pick("file_path")}\`\n\n\`\`\`diff\n- ${old.replace(/\n/g, "\n- ")}\n+ ${neu.replace(/\n/g, "\n+ ")}\n\`\`\``;
    }
    case "Bash":
      return `${pick("description") ? `_${pick("description")}_\n\n` : ""}\`\`\`bash\n${truncate(input.command, 1200)}\n\`\`\``;
    case "Grep":
      return `pattern: \`${pick("pattern")}\`${pick("path") ? ` in \`${pick("path")}\`` : ""}`;
    case "Glob":
      return `\`${pick("pattern")}\``;
    default: {
      const json = truncate(JSON.stringify(input, null, 2), 1000);
      return `\`\`\`json\n${json}\n\`\`\``;
    }
  }
}

const lines = readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean);

const out = ["# AI Conversation Log", ""];
out.push(`_Converted from \`${input}\` — ${lines.length} raw events._`, "");

let turn = 0;
let lastRole = null;

for (const line of lines) {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    continue;
  }
  if (ev.type !== "user" && ev.type !== "assistant") continue;
  const content = ev.message?.content;
  if (!Array.isArray(content)) continue;

  // A user turn that only carries a tool_result is not part of the readable dialogue.
  if (ev.type === "user" && !content.some((c) => c.type === "text")) continue;

  if (ev.type === "user") {
    const text = cleanText(content.filter((c) => c.type === "text").map((c) => c.text).join("\n\n"));
    if (!text) continue;
    turn += 1;
    out.push(`## ${turn}. 👤 User`, "", text, "");
    lastRole = "user";
    continue;
  }

  // assistant
  if (lastRole !== "assistant") {
    out.push(`## 🤖 Assistant`, "");
  }
  lastRole = "assistant";

  for (const part of content) {
    if (part.type === "thinking" && part.thinking?.trim()) {
      out.push(
        "<details><summary>💭 Thinking</summary>",
        "",
        truncate(part.thinking.trim(), 4000),
        "",
        "</details>",
        "",
      );
    } else if (part.type === "text" && part.text?.trim()) {
      out.push(part.text.trim(), "");
    } else if (part.type === "tool_use" && !SKIP_TOOLS.has(part.name)) {
      out.push(`> 🔧 **${part.name}** — ${toolSummary(part.name, part.input)}`, "");
    }
  }
}

writeFileSync(output, `${out.join("\n").replace(/\n{3,}/g, "\n\n")}\n`);
console.log(`Wrote ${output} (${turn} user turns) from ${lines.length} events.`);
