"use client";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { MobileNav } from "@/components/explore/mobile/mobile-nav";
import { StalkersList } from "@/components/profile/stalkers-list";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { ProfileAnalyticsView } from "@/components/profile/profile-analytics";
import { Sparkles, User, Heart, Eye, EyeOff, ChartBar, ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileFormData } from "@/lib/constants";
import { AnonymousModeAlert } from "@/components/anonymous/AnonymousModeAlert";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface ProfileClientPageProps {
  profile: ProfileFormData;
  initialActiveSection?: string | null;
}

export function ProfileClientPage({ profile, initialActiveSection = null }: ProfileClientPageProps) {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [activeSection, setActiveSection] = useState<string | null>(initialActiveSection);
  const [formValues, setFormValues] = useState<ProfileFormData>(profile);
  const [showPreview, setShowPreview] = useState(true);
  const [showAnonymousAlert, setShowAnonymousAlert] = useState(!profile.anonymous);
  const [isAnonymous, setIsAnonymous] = useState(profile.anonymous || false);
  const [attemptNavigateToPrivacy, setAttemptNavigateToPrivacy] = useState(0);

  useEffect(() => {
    if (initialActiveSection) {
      setActiveSection(initialActiveSection);
    }
  }, [initialActiveSection]);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setActiveTab("profile");
    setTimeout(() => {
      const section = document.getElementById(`section-${sectionId}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    if (attemptNavigateToPrivacy === 0) return;

    if (activeTab === "profile") {
      const timerId = setTimeout(() => {
        const mainTabsContainer = document.querySelector('.main-tabs-container');
        if (!mainTabsContainer) {
          console.error("ValspaceDev: .main-tabs-container element NOT FOUND.");
          return;
        }

        const mainProfileTabPanel = mainTabsContainer.querySelector(
          '[role="tabpanel"][data-state="active"][value="profile"]'
        );

        if (!mainProfileTabPanel) {
          // It's possible the active state update for the tabpanel is delayed
          // or the value attribute isn't the sole unique identifier when not active.
          // We already ensure activeTab === "profile", so the tab content for profile should be active.
          console.error("ValspaceDev: Active Profile Tab Panel ([role='tabpanel'][data-state='active'][value='profile']) within .main-tabs-container NOT FOUND.");
          return;
        }
        
        const profileFormInternalTabsContainer = mainProfileTabPanel.querySelector('.tabs-container');
        if (!profileFormInternalTabsContainer) {
          console.error("ValspaceDev: ProfileForm's internal .tabs-container within profile tab panel NOT FOUND.");
          return;
        }

        const privacyTabButton = profileFormInternalTabsContainer.querySelector(
          '[role="tab"][value="privacy"]'
        ) as HTMLButtonElement;

        if (privacyTabButton) {
          privacyTabButton.click();

          setTimeout(() => {
            const privacySection = document.getElementById('section-privacy');
            if (privacySection) {
              privacySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              console.error("ValspaceDev: section-privacy NOT FOUND for scrolling.");
            }
          }, 150); 
        } else {
          console.error("ValspaceDev: Privacy tab button ([role='tab'][value='privacy']) in ProfileForm's internal tabs NOT FOUND.");
        }
      }, 100); // Timeout for DOM readiness

      return () => clearTimeout(timerId); // Cleanup timeout
    }
  }, [activeTab, attemptNavigateToPrivacy]);

  const handleFormValuesChange = (values: ProfileFormData) => {
    setFormValues(values);
    if (values.anonymous && showAnonymousAlert) {
      setShowAnonymousAlert(false);
    }
  };

  const handleAnonymousToggle = (checked: boolean) => {
    setIsAnonymous(checked);
    setFormValues(prev => ({
      ...prev,
      anonymous: checked
    }));
    if (checked && showAnonymousAlert) {
      setShowAnonymousAlert(false);
    }
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
          {showAnonymousAlert && (
            <Card className="mb-6 border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                      New Feature: Anonymous Mode
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                        NEW
                      </span>
                    </h3>
                    <p className="mt-2 text-sm text-purple-700 dark:text-purple-400">
                      Keep your identity private while exploring connections. Your photos will be hidden and you'll only match with other anonymous users.
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="anonymous-mode"
                          checked={isAnonymous}
                          onCheckedChange={handleAnonymousToggle}
                          className="data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor="anonymous-mode" className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          Enable Anonymous Mode
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAnonymousAlert(false)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="sticky top-0 z-20 backdrop-blur-lg bg-white/90 dark:bg-background/90 pb-4 pt-3 border-b border-pink-100 dark:border-pink-900 shadow-md px-4 sm:px-6 -mx-4 sm:-mx-6 md:mx-0 rounded-b-xl">
            <h1 className="text-2xl font-bold tracking-tight text-center mb-4 text-gradient bg-gradient-to-r from-pink-500 to-pink-700 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent">
              StrathSpace
            </h1>
            
            <TooltipProvider delayDuration={300}>
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full main-tabs-container">
                <TabsList className="grid grid-cols-4 w-full mb-2 p-2 bg-pink-50/80 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-800 rounded-xl relative overflow-hidden shadow-md">
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
                        data-profile-tab="main"
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

                    {showPreview && (
                      <div className="lg:hidden mb-6">
                        <ProfilePreview profile={formValues} className="shadow-md" />
                      </div>
                    )}
                    
                    <div className="flex-1 relative rounded-lg overflow-hidden border border-pink-100 dark:border-pink-950 bg-white/50 dark:bg-background/50 shadow-sm">
                      <div className="p-4 sm:p-6">
                        <ProfileForm 
                          initialData={profile} 
                          activeTab={activeSection}
                          onFormValuesChange={handleFormValuesChange}
                        />
                      </div>
                    </div>
                    
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