import type { Checkout } from "@/lib/checkout/order";

declare global {
  interface Window {
    payfast_do_onsite_payment?: (options: { uuid: string }, callback: (paid: boolean) => void) => void;
  }
}

/** PayFast's own payment page, by the signed form: the way when Onsite cannot open. */
function redirectToPayfast(checkout: Pick<Checkout, "action" | "fields">) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.action;
  for (const [name, value] of checkout.fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}

function loadEngine(src: string): Promise<void> {
  if (window.payfast_do_onsite_payment) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => (window.payfast_do_onsite_payment ? resolve() : reject(new Error("PayFast's script loaded empty")));
    script.onerror = () => reject(new Error("PayFast's script didn't load"));
    document.head.append(script);
  });
}

/**
 * Takes the payment: PayFast's Onsite window over this page when it has an
 * identifier and its script loads, which reports whether the customer paid;
 * otherwise PayFast's own page, which returns them to the receipt or back
 * here. Resolves to "paid" or "closed" for Onsite; never resolves for the
 * redirect, because the page goes.
 */
export async function pay(checkout: Checkout): Promise<"paid" | "closed"> {
  if (checkout.onsite) {
    try {
      await loadEngine(checkout.onsite.engine);
      const { uuid } = checkout.onsite;
      return await new Promise((resolve) => window.payfast_do_onsite_payment!({ uuid }, (paid) => resolve(paid ? "paid" : "closed")));
    } catch (e) {
      console.error(e);
    }
  }
  redirectToPayfast(checkout);
  return new Promise(() => {});
}
