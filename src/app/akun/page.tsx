import AppShell from "@/components/AppShell";
import PasswordForm from "@/components/PasswordForm";
import { requireUser } from "@/lib/auth";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="h1">Ganti kata sandi</h1>
      <p className="muted">Akun: {user.name}</p>
      <PasswordForm />
    </AppShell>
  );
}
