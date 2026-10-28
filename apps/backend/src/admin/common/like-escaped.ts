/** `text` matched literally inside a `LIKE` pattern. */
export function likeEscaped(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}
