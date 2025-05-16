"use client";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { MobileNav } from "@/components/explore/mobile/mobile-nav";
import { StalkersList } from "@/components/profile/stalkers-list";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { ProfileAnalyticsView } from "@/components/profile/profile-analytics";
import { Sparkles, User, Heart, Eye, EyeOff, ChartBar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileFormData } from "@/lib/constants";

interface ProfileClientPageProps {
  profile: ProfileFormData;
  initialActiveSection?: string | null;
}

export function ProfileClientPage({ profile, initialActiveSection = null }: ProfileClientPageProps) {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [activeSection, setActiveSection] = useState<string | null>(initialActiveSection);
  const [formValues, setFormValues] = useState<ProfileFormData>(profile);
  const [showPreview, setShowPreview] = useState(true);

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

  // Handle form value changes for real-time preview
  const handleFormValuesChange = (values: ProfileFormData) => {
    setFormValues(values);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile data is not available. Please try again.</p>
      </div>
    );
  }

  const tooltipStyles = "bg-white/95 dark:bg-slate-800 border-2 border-pink-300 dark:border-pink-700 p-2.5 text-sm font-medium text-pink-900 dark:text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] dark:shadow-[0_0_15px_rgba(236,72,153,0.4)] rounded-lg backdrop-blur-sm";

  return (
    <>
      <MobileNav />
      <div className="min-h-screen bg-gradient-to-b from-pink-50/30 to-white dark:from-pink-950/30 dark:to-background">
        <div className="container max-w-7xl pt-16 pb-20">
          <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-background/80 pb-2 pt-2 border-b">
            <h1 className="text-2xl font-bold tracking-tight text-center mb-4 text-gradient bg-gradient-to-r from-pink-500 to-pink-700 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent">
              StrathSpace
            </h1>
            
            <TooltipProvider delayDuration={300}>
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 w-full mb-4 p-1.5 bg-pink-50/50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900 rounded-xl relative overflow-hidden">
                  {/* Visual separators between tabs */}
                  <div className="absolute top-3 bottom-3 left-1/4 w-px bg-pink-200 dark:bg-pink-800/50"></div>
                  <div className="absolute top-3 bottom-3 left-1/2 w-px bg-pink-200 dark:bg-pink-800/50"></div>
                  <div className="absolute top-3 bottom-3 left-3/4 w-px bg-pink-200 dark:bg-pink-800/50"></div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="profile" 
                        className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                          data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                          rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                          hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                          after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2  
                          after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                      >
                        <User className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline font-medium">Profile</span>
                        <span className="sm:hidden">Profile</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                      Edit your profile information
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="completion" 
                        className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                          data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                          rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                          hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                          after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2  
                          after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                      >
                        <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline font-medium">Progress</span>
                        <span className="sm:hidden">Progress</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                      Track your profile completion progress
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="stalkers" 
                        className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                          data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                          rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                          hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                          after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2  
                          after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                      >
                        <Heart className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline font-medium">Activity</span>
                        <span className="sm:hidden">Activity</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                      See recent profile activity
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="analytics" 
                        className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                          data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                          rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                          hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                          after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2  
                          after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                      >
                        <ChartBar className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline font-medium">Analytics</span>
                        <span className="sm:hidden">Stats</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                      View your profile analytics and stats
                    </TooltipContent>
                  </Tooltip>
                </TabsList>

                <TabsContent value="profile" className="mt-6 animate-in fade-in-50 duration-300">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Show/Hide Preview Toggle (Mobile) */}
                    <div className="lg:hidden mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="w-full flex items-center justify-center gap-2 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300"
                      >
                        {showPreview ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Hide Preview
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Show Preview
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Mobile Preview (Conditional) */}
                    {showPreview && (
                      <div className="lg:hidden mb-6">
                        <ProfilePreview profile={formValues} className="shadow-md" />
                      </div>
                    )}
                    
                    {/* Form Section (Left on Desktop) */}
                    <div className="flex-1 relative rounded-lg overflow-hidden border border-pink-100 dark:border-pink-950 bg-white/50 dark:bg-background/50 shadow-sm">
                      <div className="p-4 sm:p-6">
                        <ProfileForm 
                          initialData={profile} 
                          activeTab={activeSection}
                          onFormValuesChange={handleFormValuesChange}
                        />
                      </div>
                    </div>
                    
                    {/* Preview Section (Right on Desktop) */}
                    <div className="hidden lg:block w-80 xl:w-96 sticky top-24 self-start">
                      <ProfilePreview profile={formValues} className="shadow-md" />
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

                <TabsContent value="analytics" className="mt-6 animate-in fade-in-50 duration-300">
                  <div className="bg-white dark:bg-background rounded-lg p-6 border border-pink-100 dark:border-pink-950 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <ChartBar className="w-5 h-5 text-pink-500" />
                      Profile Analytics
                    </h2>
                    <ProfileAnalyticsView userId={profile.userId} />
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