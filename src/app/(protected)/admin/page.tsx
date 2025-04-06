import { Suspense } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminStats } from '@/components/admin/stats-cards';
import { UserManagement } from '@/components/admin/user-management';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { getAdminStats, getUsers, getAnalyticsData } from '@/lib/actions/admin.actions';
import { AdminTabsNavigation } from '@/components/admin/tabs-navigation';
import { UserWithProfile } from '@/components/admin/user-management';
interface AdminPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const tab = resolvedParams?.tab || "users";
  
  const activeTab = ["users", "analytics"].includes(tab) ? tab : "users";

  const [stats, usersData, analyticsData] = await Promise.all([
    getAdminStats(),
    getUsers(),
    getAnalyticsData()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      </div>
      
      <AdminStats {...stats} />
      
      <Tabs defaultValue={activeTab} className="space-y-4">
        <AdminTabsNavigation activeTab={activeTab} />
        
        <TabsContent value="users" className="space-y-4">
          <Suspense fallback={<UserListSkeleton />}>
            <UserManagement users={usersData as unknown as UserWithProfile[]} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Suspense fallback={<AnalyticsSkeleton />}>
            <AnalyticsDashboard {...analyticsData} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Loading user data...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[140px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-4 w-[80px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[180px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
} 