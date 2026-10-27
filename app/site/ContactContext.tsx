"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_CONTACT, whatsappLink, type ShopContact } from "@/lib/contact";

const ContactContext = createContext<ShopContact>(DEFAULT_CONTACT);

/** Hands the shop's contact details (set in the admin's Settings) to the client components below the root layout. */
export const ContactProvider = ({ contact, children }: { contact: ShopContact; children: ReactNode }) => <ContactContext value={contact}>{children}</ContactContext>;

export const useContact = () => useContext(ContactContext);

/** Builds a WhatsApp link to the shop's number, with the message already written. */
export function useWhatsApp() {
  const contact = useContact();
  return (message: string) => whatsappLink(contact, message);
}
