import type { Metadata } from "next";
import AuthScreen from "@/components/auth/auth-screen";

export const metadata: Metadata = {
  title: "Log In | Earnest Tasks",
};

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
