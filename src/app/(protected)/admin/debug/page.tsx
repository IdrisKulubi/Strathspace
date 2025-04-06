import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export default async function AdminDebugPage() {
  const session = await auth();
  
  // Get user from database to check the role
  const user = session?.user?.id 
    ? await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      })
    : null;
  
  // Get the allowed admin emails from environment
  const allowedAdminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  
  // Check if the current user's email is in the allowed list
  const isEmailAllowed = session?.user?.email 
    ? allowedAdminEmails.includes(session.user.email)
    : false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Access Debug</CardTitle>
          <CardDescription>
            Information about your admin access permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">User Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Email:</div>
              <div>{session?.user?.email || "Not logged in"}</div>
              
              <div className="font-medium">Role from session:</div>
              <div>
                <Badge variant={session?.user?.role === "admin" ? "default" : "outline"}>
                  {session?.user?.role || "none"}
                </Badge>
              </div>
              
              <div className="font-medium">Role from database:</div>
              <div>
                <Badge variant={user?.role === "admin" ? "default" : "outline"}>
                  {user?.role || "none"}
                </Badge>
              </div>
              
              <div className="font-medium">Email in allowed list:</div>
              <div>
                <Badge variant={isEmailAllowed ? "success" : "outline"}>
                  {isEmailAllowed ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="font-medium">Admin access granted:</div>
              <div>
                <Badge 
                  variant={(isEmailAllowed || user?.role === "admin") ? "success" : "destructive"}
                >
                  {(isEmailAllowed || user?.role === "admin") ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Environment Configuration</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Allowed Admin Emails:</div>
              <div>
                {allowedAdminEmails.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {allowedAdminEmails.map(email => (
                      <li key={email} className="break-all">
                        {email === session?.user?.email ? (
                          <span className="font-bold text-primary">{email}</span>
                        ) : (
                          email
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-destructive">No admin emails configured</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>How Admin Access Works</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Admin access is granted if either:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            <li>Your email is in the <code>ADMIN_EMAILS</code> environment variable</li>
            <li>Your user account has the role set to &quot;admin&quot; in the database</li>
          </ul>
          <p className="mt-4 text-sm">
            If your email is in the allowed list but your role is not &quot;admin&quot;, 
            your role will be automatically updated to &quot;admin&quot; when you try to access
            admin pages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 