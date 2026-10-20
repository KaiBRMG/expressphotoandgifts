/** While a console page reads the catalogue: the page's shape, quiet, beside the sidebar. */
export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading…
      </p>
      <div className="loading" aria-hidden="true">
        <span className="loading__bar loading__bar--title" />
        <span className="loading__bar loading__bar--tools" />
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="loading__row" />
        ))}
      </div>
    </div>
  );
}
