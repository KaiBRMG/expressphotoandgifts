/** Account wording said on both sides: the page says it before asking, and the server when it refuses. */

const list = new Intl.ListFormat("en-ZA");

/** Why the account can't be deleted yet: the orders still on their way. */
export function stillOnTheWay(refs: string[]): string {
  const one = refs.length === 1;
  return `${list.format(refs)} ${one ? "is" : "are"} still on ${one ? "its" : "their"} way to you. You can delete your account once ${one ? "it has" : "they have"} arrived.`;
}

/** Why an order's photos can't be deleted yet: it is still being made or on its way. */
export const photosStillNeeded = (ref: string) => `${ref} is still on its way to you, and the shop may need its photos until it arrives. You can delete them once it has.`;
