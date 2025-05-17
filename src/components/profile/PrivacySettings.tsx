"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LockKeyhole, Info, Shield, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnonymousToggle } from "@/components/anonymous/AnonymousToggle";
import { cn } from "@/lib/utils";
import { ProfileFormData } from "@/lib/constants";

interface PrivacySettingsProps {
  profile: ProfileFormData;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (field: keyof Omit<ProfileFormData, "profilePhoto">, value: any) => Promise<void> | void;
}

export function PrivacySettings({ profile, onUpdate }: PrivacySettingsProps) {
  const [isAnonymous, setIsAnonymous] = useState(profile.anonymous || false);
  
  useEffect(() => {
    setIsAnonymous(profile.anonymous || false);
  }, [profile.anonymous]);
  
  const handleAnonymousChange = (value: boolean) => {
    setIsAnonymous(value);
    if (onUpdate) {
      onUpdate("anonymous", value);
    }
  };
  
  const tooltipStyles = "bg-white/95 dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 p-2.5 text-sm font-medium text-slate-900 dark:text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] dark:shadow-[0_0_15px_rgba(147,51,234,0.4)] rounded-lg backdrop-blur-sm";
  
  return (
    <TooltipProvider delayDuration={300}>
      <Card id="section-privacy" className={cn(
        "relative overflow-hidden transition-all duration-300 border-2 shadow-lg hover:shadow-xl",
        isAnonymous ? 
          "border-purple-300 dark:border-purple-700" : 
          "border-gray-200 dark:border-gray-800"
      )}>
        <div className={cn(
          "absolute top-0 left-0 right-0 h-2",
          isAnonymous ? 
            "bg-gradient-to-r from-purple-400 to-indigo-500" : 
            "bg-gradient-to-r from-gray-400 to-gray-500"
        )}></div>
        
        <CardHeader className={cn(
          "bg-gradient-to-r",
          isAnonymous ?
            "from-purple-50/80 to-white/90 dark:from-purple-950/70 dark:to-slate-950/90" :
            "from-gray-50/80 to-white/90 dark:from-gray-950/70 dark:to-slate-950/90"
        )}>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            {isAnonymous ? (
              <EyeOff className="w-5 h-5 text-purple-500" />
            ) : (
              <Shield className="w-5 h-5 text-gray-500" />
            )}
            
            Privacy Settings
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-purple-400 cursor-help ml-1" />
              </TooltipTrigger>
              <TooltipContent side="top" className={tooltipStyles}>
                <p>Control your privacy and how others can see and interact with your profile</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription className={cn(
            isAnonymous ? "text-purple-700 dark:text-purple-300" : "text-gray-500 dark:text-gray-400"
          )}>
            Manage your visibility and privacy options
          </CardDescription>
        </CardHeader>
        
        <CardContent className={cn(
          "p-5 pt-6",
          isAnonymous ? 
            "bg-white/95 dark:bg-slate-950/95" : 
            "bg-white dark:bg-slate-950"
        )}>
          <div className="space-y-6">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 mb-4 text-lg font-medium">
                <LockKeyhole className="w-5 h-5 text-purple-500" />
                Privacy Options
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-purple-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className={tooltipStyles}>
                    Control who can see your profile and how you appear to others
                  </TooltipContent>
                </Tooltip>
              </Label>
              
              <AnonymousToggle 
                initialState={isAnonymous}
                currentAvatar={profile.anonymousAvatar || null}
                onChange={handleAnonymousChange}
              />
            </div>
            
            {isAnonymous && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/50 mt-4">
                <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-1.5" />
                  How Anonymous Mode Works
                </h4>
                <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1.5 ml-6 list-disc">
                  <li>Your photos are hidden and replaced with your chosen avatar</li>
                  <li>You&apos;ll only match with other anonymous users</li>
                  <li>You can request to reveal your identity to matches later</li>
                  <li>Your basic info and interests remain visible</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
} 