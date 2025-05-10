"use client";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileFormData } from "@/lib/actions/profile.actions";
import { MobileNav } from "@/components/explore/mobile/mobile-nav";
import { StalkersList } from "@/components/profile/stalkers-list";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { Sparkles, User, Heart, Settings, InfoIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProfileClientPageProps {
  profile: ProfileFormData;
  initialActiveSection?: string | null;
}

export function ProfileClientPage({ profile, initialActiveSection = null }: ProfileClientPageProps) {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [activeSection, setActiveSection] = useState<string | null>(initialActiveSection);

  // Handle initial section if provided in URL
  useEffect(() => {
    if (initialActiveSection) {
      setActiveSection(initialActiveSection);
    }
  }, [initialActiveSection]);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setActiveTab("profile"); // Switch to profile tab when clicking a section
    
    // Add a small delay to ensure the state updates before scrolling
    setTimeout(() => {
      const section = document.getElementById(`section-${sectionId}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile data is not available. Please try again.</p>
      </div>
    );
  }

  return (
    <>
      <MobileNav />
      <div className="min-h-screen bg-gradient-to-b from-pink-50/30 to-white dark:from-pink-950/30 dark:to-background">
        <div className="container max-w-4xl pt-16 pb-20">
          <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-background/80 pb-2 pt-2 border-b">
            <h1 className="text-2xl font-bold tracking-tight text-center mb-4 text-gradient bg-gradient-to-r from-pink-500 to-pink-700 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent">
              StrathSpace
            </h1>
            
            <TooltipProvider>
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 w-full mb-4 p-1 bg-pink-50/50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900 rounded-xl">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="profile" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 rounded-lg">
                        <User className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Profile</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-white dark:bg-slate-900 border border-pink-100 dark:border-pink-800 p-2 shadow-lg">
                      Edit your profile information
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="completion" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 rounded-lg">
                        <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Progress</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-white dark:bg-slate-900 border border-pink-100 dark:border-pink-800 p-2 shadow-lg">
                      Check your profile completion status
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="stalkers" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 rounded-lg">
                        <Heart className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Activity</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-white dark:bg-slate-900 border border-pink-100 dark:border-pink-800 p-2 shadow-lg">
                      See recent profile activity
                    </TooltipContent>
                  </Tooltip>
                </TabsList>

                <TabsContent value="profile" className="mt-6 animate-in fade-in-50 duration-300">
                  <div className="relative rounded-lg overflow-hidden border border-pink-100 dark:border-pink-950 bg-white/50 dark:bg-background/50">
                    <div className="p-4 sm:p-6">
                      <ProfileForm 
                        initialData={profile} 
                        activeTab={activeSection}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="completion" className="mt-6 animate-in fade-in-50 duration-300">
                  <div className="bg-white dark:bg-background rounded-lg p-6 border border-pink-100 dark:border-pink-950 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-pink-500" />
                      Profile Progress
                    </h2>
                    
                    <ProfileCompletion 
                      profile={profile} 
                      onSectionClick={(section) => {
                        handleSectionClick(section);
                      }}
                    />
                    
                    <div className="mt-6">
                      <Button 
                        className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-md hover:shadow-lg transition-all"
                        onClick={() => {
                          setActiveTab("profile");
                        }}
                      >
                        Continue Editing Profile
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stalkers" className="mt-6 animate-in fade-in-50 duration-300">
                  <div className="bg-white dark:bg-background rounded-lg p-6 border border-pink-100 dark:border-pink-950 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-500" />
                      Profile Activity
                    </h2>
                    <StalkersList />
                  </div>
                </TabsContent>
              </Tabs>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </>
  );
} 