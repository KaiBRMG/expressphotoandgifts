/**
 * Where a field ends up, said the same way under every control: "In the shop:"
 * and the place shoppers meet it, or "Shoppers don't see this." for the shop's
 * own records. Inline, so it sits inside a Mantine description or a hint.
 */
export function Where({ children, internal = false }: { children?: React.ReactNode; internal?: boolean }) {
  return (
    <span className="where">
      <span className="where__lead">{internal ? "Shoppers don’t see this." : "In the shop:"}</span>
      {children ? <> {children}</> : null}
    </span>
  );
}
