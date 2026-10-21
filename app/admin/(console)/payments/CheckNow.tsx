"use client";

import { Button } from "@mantine/core";
import { checkPaymentsAction } from "@/app/admin/actions";
import { useOrderAction } from "../orders/[ref]/OrderActions";

/** Checks the month against PayFast now, as the daily check does, and redraws the page with what it found. */
export function CheckNow({ month }: { month: string }) {
  const { pending, error, run } = useOrderAction();
  return (
    <>
      <Button variant="light" loading={pending} onClick={() => run(() => checkPaymentsAction(month))}>
        Check now
      </Button>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
