import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { orderRecipients, shippingBoxes, shopContactInput } from "@/lib/settings";
import { OrderRecipients } from "./OrderRecipients";
import { PublicContact } from "./PublicContact";
import { ShippingBoxes } from "./ShippingBoxes";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [emails, boxes, contact] = await Promise.all([orderRecipients(), shippingBoxes(), shopContactInput()]);
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Settings</h1>
        </div>
      </header>
      <section className="osec" aria-labelledby="contact-title">
        <h2 id="contact-title" className="osec__title">
          Shop Contact Details
        </h2>
        <h3 className="osec__sub">Shown to the public</h3>
        <PublicContact initial={contact} />
        <h3 className="osec__sub">Email notifications</h3>
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
