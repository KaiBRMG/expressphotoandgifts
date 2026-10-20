"use client";

import { useEffect } from "react";
import { Button } from "@mantine/core";

/** A console page that couldn't load, most often the catalogue read failing. Nothing was changed by it. */
export default function ConsoleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page page--narrow empty" role="alert">
      <h1 className="empty__title">This page didn’t load.</h1>
      <p className="empty__lede">
        The catalogue couldn’t be read just now, often a dropped connection. Nothing was changed. Try again, and if it keeps happening, note the
        reference below for whoever looks after the site.
      </p>
      <div className="row">
        <Button onClick={() => retry()}>Try again</Button>
      </div>
      {error.digest ? <p className="hint mono">Reference {error.digest}</p> : null}
    </div>
  );
}
