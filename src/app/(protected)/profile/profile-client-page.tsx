"use client";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileFormData } from "@/lib/actions/profile.actions";
import { MobileNav } from "@/components/explore/mobile/mobile-nav";
import { StalkersList } from "@/components/profile/stalkers-list";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { Sparkles } from "lucide-react";


interface ProfileClientPageProps {
  profile: ProfileFormData;
  initialActiveSection?: string | null;
}

export function ProfileClientPage({ profile, initialActiveSection = null }: ProfileClientPageProps) {
  const [activeSection, setActiveSection] = useState<string | null>(initialActiveSection);

  // Handle initial section if provided in URL
  useEffect(() => {
    if (initialActiveSection) {
      setActiveSection(initialActiveSection);
    }
  }, [initialActiveSection]);

  const handleSectionClick = (sectionId: string) => {
    console.log("Clicked section:", sectionId);
    setActiveSection(sectionId);
    
    // Add a small delay to ensure the state updates before scrolling
    setTimeout(() => {
      // Try to find the section element directly
      const section = document.getElementById(`section-${sectionId}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  if (!profile) {
    // This should ideally be handled by the server component redirecting,
    // but as a fallback:
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
        <div className="container max-w-4xl pt-24 pb-12">
          {/* Header Section */}
          <div className="relative space-y-4 mb-6">
            <div
              aria-hidden="true"
              className="absolute -top-6 right-0 text-pink-500/10 text-7xl select-none"
            >
              💝
            </div>
            <div
              aria-hidden="true"
              className="absolute -top-4 left-0 text-pink-500/10 text-6xl select-none rotate-[-15deg]"
            >
              ✨
            </div>
            <div className="relative">
              <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-gradient bg-gradient-to-r from-pink-500 to-pink-700 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent">
                <Sparkles
                  aria-hidden="true"
                  className="w-8 h-8 text-pink-500"
                />
                <span>My Profile</span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Update your profile and find your perfect match 💝
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 text-sm font-medium">
              <div className="relative flex h-2 w-2">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                <div className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
              </div>
              <span>Profile Active</span>
            </div>
          </div>

          {/* Profile Completion Component */}
          <div className="mb-8">
            <ProfileCompletion 
              profile={profile} 
              onSectionClick={handleSectionClick}
            />
            {/* will decide if to remove this button or not */}
            {/* {calculateProfileCompletion(profile).incompleteSections.length > 0 && (
              <Button 
                className="mt-4 w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
                onClick={() => {
                  const { incompleteSections } = calculateProfileCompletion(profile);
                  if (incompleteSections.length > 0) {
                    handleSectionClick(incompleteSections[0].id);
                  }
                }}
              >
                Improve Your Profile
              </Button>
            )} */}
          </div>
          
          <section className="space-y-6 mb-8">
            <StalkersList />
          </section>
          
          {/* Profile Form Card Container */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-white/50 dark:bg-background/50 rounded-2xl backdrop-blur-sm"
            />
            <div className="relative rounded-2xl overflow-hidden border border-pink-100 dark:border-pink-950">
              <div className="p-6 sm:p-8">
                <ProfileForm 
                  initialData={profile} 
                  activeTab={activeSection}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 