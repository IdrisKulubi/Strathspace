import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/nav";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Strathspace",
  description: "Admin dashboard for Strathspace platform management",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  
  
  if (!session?.user) {
    redirect("/login");
  }
  
  const allowedAdminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  
  const isEmailAllowed = session.user.email && allowedAdminEmails.includes(session.user.email);
  
  if (!isEmailAllowed && session.user.role !== "admin") {
    redirect("/no-access");
  }
  

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background">
      <AdminNav />
      <main className="p-4 md:p-8 max-w-screen-2xl mx-auto">
        {children}
      </main>
      <footer className="border-t py-4 px-8 mt-12 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} StrathSpace Admin Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
} 