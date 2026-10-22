/** Account wording said on both sides: the page says it before asking, and the server when it refuses. */

const list = new Intl.ListFormat("en-ZA");

/** Why the account can't be deleted yet: the orders still on their way. */
export function stillOnTheWay(refs: string[]): string {
  const one = refs.length === 1;
  return `${list.format(refs)} ${one ? "is" : "are"} still on ${one ? "its" : "their"} way to you. You can delete your account once ${one ? "it has" : "they have"} arrived.`;
}
