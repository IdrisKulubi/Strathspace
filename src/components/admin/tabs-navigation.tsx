'use client';

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

interface AdminTabsNavigationProps {
  activeTab: string;
}

export function AdminTabsNavigation({ activeTab }: AdminTabsNavigationProps) {
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(`?tab=${value}`);
  };

  return (
    <TabsList className="grid w-full md:w-auto grid-cols-2 h-auto md:h-10">
      <TabsTrigger 
        value="users" 
        className="data-[state=active]:bg-pink-100 dark:data-[state=active]:bg-pink-900"
        onClick={() => handleTabChange("users")}
        data-state={activeTab === "users" ? "active" : "inactive"}
      >
        User Management
      </TabsTrigger>
      <TabsTrigger 
        value="analytics" 
        className="data-[state=active]:bg-pink-100 dark:data-[state=active]:bg-pink-900"
        onClick={() => handleTabChange("analytics")}
        data-state={activeTab === "analytics" ? "active" : "inactive"}
      >
        Analytics
      </TabsTrigger>
    </TabsList>
  );
} 