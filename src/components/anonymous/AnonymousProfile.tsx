"use client";


import { Profile } from "@/db/schema";
import { AnonymousAvatar } from "./AnonymousAvatar";
import { GraduationCap, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnonymousProfileProps {
  profile: Profile;
  onViewProfile?: () => void;
  className?: string;
}

export function AnonymousProfile({
  profile,
  onViewProfile,
  className,
}: AnonymousProfileProps) {
  return (
    <div className={cn(
      "relative w-full h-full flex flex-col items-center justify-center",
      "bg-gradient-to-b from-primary/5 via-background to-primary/10",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-0" />
      
      <div className="z-10 flex flex-col items-center justify-center space-y-6 p-6">
        <AnonymousAvatar 
          avatarId={profile.anonymousAvatar} 
          size="xl"
          className="border-4 border-primary/20"
        />
        
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            Anonymous User
          </h2>
          <p className="text-sm text-white/90">
            This user is in Anonymous Mode
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full p-4 text-white z-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold flex items-center">
            {profile.firstName}, {profile.age}
          </h2>
          <button
            onClick={onViewProfile}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition"
            aria-label="View profile details"
          >
            <Info className="h-5 w-5 text-white" />
          </button>
        </div>

        {profile.course && (
          <div className="flex items-center gap-1 text-sm text-white/90 mt-1">
            <GraduationCap className="h-4 w-4" />
            <span>{profile.course}</span>
            {profile.yearOfStudy && (
              <span className="opacity-75">• Year {profile.yearOfStudy}</span>
            )}
          </div>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.interests.slice(0, 3).map((interest, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-full bg-white/20 backdrop-blur-sm"
              >
                {interest}
              </span>
            ))}
            {profile.interests.length > 3 && (
              <span className="px-2 py-1 text-xs rounded-full bg-white/20 backdrop-blur-sm">
                +{profile.interests.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 