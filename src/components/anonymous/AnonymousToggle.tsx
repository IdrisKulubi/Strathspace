"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { 
  toggleAnonymousMode,
  setAnonymousAvatar 
} from "@/lib/actions/anonymous.actions";
import { toast } from "sonner";
import { AVATARS } from "@/lib/constants";
import { Eye, EyeOff, Sparkles as SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
export function AnonymousToggle({ 
  initialState = false,
  currentAvatar = null,
  onChange
}: { 
  initialState?: boolean;
  currentAvatar?: string | null;
  onChange?: (isAnonymous: boolean) => void;
}) {
  const [isAnonymous, setIsAnonymous] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  
  const handleToggle = async (checked: boolean) => {
    setIsPending(true);
    
    try {
      const result = await toggleAnonymousMode(checked);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      setIsAnonymous(checked);
      if (onChange) {
        onChange(checked);
      }
      
      toast.success(checked ? 
        "Anonymous mode enabled! Your profile is now private." : 
        "Anonymous mode disabled. Your profile is now visible."
      );
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div className="flex flex-col space-y-6">
      {/* Main toggle with sparkle animation */}
      <div className={cn(
        "flex items-center justify-between rounded-lg p-5 transition-all duration-300 shadow-md",
        isAnonymous ? 
          "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/40 border-2 border-purple-300 dark:border-purple-700" : 
          "bg-gray-50 dark:bg-gray-900/40 border-2 border-gray-200 dark:border-gray-800"
      )}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">
              {isAnonymous ? 
                <span className="flex items-center text-purple-800 dark:text-purple-300">
                  <EyeOff className="w-5 h-5 mr-2" /> 
                  Anonymous Mode
                  <span className="relative ml-2">
                    <SparklesIcon className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full" />
                  </span>
                </span> :
                <span className="flex items-center text-gray-700 dark:text-gray-300">
                  <Eye className="w-5 h-5 mr-2" /> 
                  Anonymous Mode
                </span>
              }
            </h3>
          </div>
          <p className={cn(
            "text-sm",
            isAnonymous ? "text-purple-700 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"
          )}>
            {isAnonymous ? 
              "Your photos are hidden and you'll only match with other anonymous users" : 
              "Your profile is visible to everyone"
            }
          </p>
        </div>
        <Switch
          checked={isAnonymous}
          onCheckedChange={handleToggle}
          disabled={isPending}
          className={cn(
            "data-[state=checked]:bg-purple-600 scale-125",
            isPending && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
      
      {/* Avatar selector */}
      {isAnonymous && <AvatarSelector currentAvatar={currentAvatar} />}
    </div>
  );
}

function AvatarSelector({ currentAvatar }: { currentAvatar: string | null }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [isPending, setIsPending] = useState(false);
  
  const handleSelectAvatar = async (avatar: string) => {
    setIsPending(true);
    
    try {
      const result = await setAnonymousAvatar(avatar);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      setSelectedAvatar(avatar);
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update avatar");
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div className="space-y-4 p-5 bg-purple-50/70 dark:bg-purple-950/40 rounded-lg border-2 border-purple-200 dark:border-purple-700 shadow-md">
      <h3 className="text-md font-medium text-purple-800 dark:text-purple-300 flex items-center">
        <SparklesIcon className="w-5 h-5 mr-2 text-purple-500" />
        Choose your anonymous avatar
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            className={cn(
              "p-3 rounded-md transition-all duration-200",
              selectedAvatar === avatar 
                ? "bg-purple-100 dark:bg-purple-900/60 border-2 border-purple-400 dark:border-purple-700 shadow-md scale-105" 
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-800"
            )}
            onClick={() => handleSelectAvatar(avatar)}
            disabled={isPending}
          >
            <div className="w-full aspect-square flex items-center justify-center">
              <Image
                src={`/avatars/${avatar}.svg`}
                alt={`${avatar} avatar`}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                width={48}
                height={48}
              />
            </div>
          </button>
        ))}
      </div>
      <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
        This avatar will represent you while in anonymous mode
      </p>
    </div>
  );
} 