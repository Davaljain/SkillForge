import Link from "next/link";
export default function ForgotPassword() {
  return (<main className="mx-auto max-w-sm px-6 py-20">
    <h1 className="text-3xl font-semibold mb-3">Reset your password</h1>
    <p className="text-muted text-sm mb-4">Password reset by email isn&apos;t enabled yet. It needs an email service (such as Resend or SendGrid) configured on the backend.</p>
    <p className="text-muted text-sm mb-6">Until then, create a new account or ask the administrator to reset your password in the database.</p>
    <Link href="/login" className="btn inline-block">Back to login</Link></main>);
}
