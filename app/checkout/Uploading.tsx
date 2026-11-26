/**
 * Over a photo still on its way to the shop: the photo dimmed, a turning ring
 * and the word. Where the box is too narrow for the word at a readable size
 * (a phone's tray), only the ring shows. Hidden from screen readers: the
 * photo's own label says it is uploading.
 */
export function Uploading() {
  return (
    <span className="uploading" aria-hidden="true">
      <span className="services__spin" />
      <span className="uploading__word">Uploading</span>
    </span>
  );
}
