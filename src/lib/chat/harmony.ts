// Some OpenRouter-served gpt-oss models leak their Harmony channel structure
// into plain content: the special tokens get dropped but the channel text
// survives, producing strings like
//   "analysis<chain of thought>assistantcommentary to=functions.get_report
//    json{...}assistantfinal<the real answer>"
// The real user-facing answer is always the text after the LAST
// "assistantfinal" marker; everything before it is reasoning and tool-call
// echoes that must never reach the user (or the next turn's history, where
// it demonstrably confuses the model).
//
// Applied client-side at the single point where streamed tokens accumulate,
// so both the live display and the stored transcript stay clean.

const FINAL_MARKER = "assistantfinal";

// Leading channel openers — if the text starts with one and no final marker
// has arrived yet, everything so far is reasoning still being streamed.
const LEAK_START = /^(analysis|commentary\b|assistantcommentary)/;

export function stripHarmonyLeak(text: string): string {
  const idx = text.lastIndexOf(FINAL_MARKER);
  if (idx !== -1) return text.slice(idx + FINAL_MARKER.length).trimStart();
  if (LEAK_START.test(text)) return "";
  return text;
}
