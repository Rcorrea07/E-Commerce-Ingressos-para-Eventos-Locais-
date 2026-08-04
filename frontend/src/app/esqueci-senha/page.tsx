import { Suspense } from "react";
import { PasswordRecovery } from "@/components/auth/PasswordRecovery";

export default function ForgotPasswordPage() { return <Suspense><PasswordRecovery mode="request" /></Suspense>; }
