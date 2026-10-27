"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Modal } from "@mantine/core";
import type { CustomerEmail } from "@/lib/admin/customers";
import { Mail } from "@/app/site/icons";
import { at } from "../../../when";

/**
 * The emails the shop sent a customer, newest first, in a window opened from
 * their contact card: their order confirmations, collection, shipping and
 * refund emails, and campaign mailings that carried them a code. Marketing
 * mailings without a code are recorded only as a count, so the window says
 * so rather than let a short list read as complete.
 */
export function EmailHistory({ emails }: { emails: CustomerEmail[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="obtn" onClick={() => setOpen(true)}>
        <Mail size={18} />
        Email history{emails.length ? ` (${emails.length})` : ""}
      </button>
      <Modal opened={open} onClose={() => setOpen(false)} title="Email history" centered radius="lg" size="lg">
        <div className="stack">
          {emails.length === 0 ? (
            <p className="osec__soft">No emails to this customer are on record yet.</p>
          ) : (
            <ul className="orows">
              {emails.map((e, i) => (
                <li key={`${e.at}-${i}`} className="orow">
                  <span className="orow__main">
                    {e.what}
                    <span className="crows__soft">
                      {" "}
                      {e.ref ? (
                        <Link className="admin-link" href={`/admin/orders/${e.ref}`}>
                          {e.ref}
                        </Link>
                      ) : (
                        e.about
                      )}
                    </span>
                  </span>
                  <span className={`orow__state${e.ok ? "" : " orow__state--bad"}`} title={e.to}>
                    {e.ok ? `Sent ${at(e.at)}` : `Failed ${at(e.at)}: ${e.error ?? "unknown"}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="osec__soft">
            Shows each order’s emails (the latest send of each kind) and campaign emails that carried a code. Other marketing email is kept as a count on the mailing, not per customer.
          </p>
          <div className="confirm__actions">
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
