/**
 * The one-click "business summary" instruction. Sent as the user turn; kept
 * short and prose-shaped because it may be read aloud. The chat's backend is
 * scoped to the one report on screen, so no anchoring note is needed.
 */
export const SUMMARY_PROMPT = `Give me a concise business summary of this company based on this financial report. Cover, in a few short paragraphs of plain prose (no tables, no bullet lists — this may be read aloud):
1. What the company does.
2. Its financial position and how it performed over the period — cite the key figures (revenue, net income, total assets, cash) with their periods.
3. Anything notable or unusual in the numbers.
Bold only the most important figures. Keep it tight and readable.`
