import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin/products");

  return (
    <main className="login">
      <div className="login__band on-dark">
        <Image src="/logo/new.png" alt="Express Photo and Gifts" width={280} height={40} className="login__logo" priority />
        <p className="login__where">Shop admin</p>
      </div>
      <div className="login__sheet">
        <h1 className="login__title">Sign in</h1>
        <p className="login__lede">For shop staff. Use the email and password the shop gave you.</p>
        <LoginForm />
      </div>
    </main>
  );
}
