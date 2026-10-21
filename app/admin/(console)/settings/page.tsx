import type { Metadata } from "next";
import { orderRecipients, shippingBoxes } from "@/lib/settings";
import { OrderRecipients } from "./OrderRecipients";
import { ShippingBoxes } from "./ShippingBoxes";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [emails, boxes] = await Promise.all([orderRecipients(), shippingBoxes()]);
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Settings</h1>
        </div>
      </header>
      <section className="osec" aria-labelledby="notify-title">
        <h2 id="notify-title" className="osec__title">
          Email notifications
        </h2>
        <OrderRecipients initial={emails} />
      </section>
      <section className="osec" aria-labelledby="boxes-title">
        <h2 id="boxes-title" className="osec__title">
          Boxes it ships in
        </h2>
        <ShippingBoxes initial={boxes} />
      </section>
    </div>
  );
}
