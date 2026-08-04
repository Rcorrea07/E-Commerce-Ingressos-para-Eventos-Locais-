import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/AuthExperience";

export default function SignUpPage() {
  return <Suspense><AuthExperience mode="sign-up" /></Suspense>;
}
