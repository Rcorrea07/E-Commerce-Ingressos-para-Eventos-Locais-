import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/AuthExperience";

export default function SignInPage() {
  return <Suspense><AuthExperience mode="sign-in" /></Suspense>;
}
