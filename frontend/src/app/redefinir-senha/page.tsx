import { Suspense } from "react";
import { PasswordRecovery } from "@/components/auth/PasswordRecovery";

export default function ResetPasswordPage() { return <Suspense><PasswordRecovery mode="reset" /></Suspense>; }
