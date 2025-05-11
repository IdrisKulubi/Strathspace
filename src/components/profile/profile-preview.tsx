"use client";

import { ProfileFormData } from "@/lib/actions/profile.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, GraduationCap, Coffee, User, Stars, Calendar, Music, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePreviewProps {
  profile: ProfileFormData;
  className?: string;
}

export function ProfilePreview({ profile, className }: ProfilePreviewProps) {
 

  const getInitials = () => {
    const first = profile.firstName?.charAt(0) || "";
    const last = profile.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  // Helper to determine if profile has a particular section completed
  const hasCompleted = (field: keyof ProfileFormData) => {
    return !!profile[field];
  };

  return (
    <div className={cn("rounded-lg border border-pink-100 dark:border-pink-900 overflow-hidden h-full flex flex-col", className)}>
      {/* Preview Header - "How Others See You" */}
      <div className="bg-gradient-to-r from-pink-600 to-pink-700 p-3 text-white">
        <h3 className="text-sm font-medium flex items-center justify-center">
          <User className="w-4 h-4 mr-2" />
          Live Preview - How Others See You
        </h3>
      </div>

      {/* Profile Header with Avatar and Basic Info */}
      <div className="bg-gradient-to-b from-pink-500 to-pink-600 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern-dots.png')] opacity-10"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-white shadow-lg">
              {profile.profilePhoto ? (
                <AvatarImage src={profile.profilePhoto} alt={profile.firstName || "Profile"} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-xl">
                  {getInitials()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <div className="bg-green-500 h-3 w-3 rounded-full"></div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold">
              {profile.firstName ? `${profile.firstName} ${profile.lastName || ""}` : "Your Name"}
              {' '}{profile.age && <span className="text-sm font-normal opacity-90">{profile.age}</span>}
            </h2>
            <div className="flex flex-wrap gap-1 mt-1">
              {profile.course && (
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-xs py-0 hover:bg-white/20">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {profile.course}
                </Badge>
              )}
              {profile.yearOfStudy && (
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-xs py-0 hover:bg-white/20">
                  <Calendar className="w-3 h-3 mr-1" />
                  Year {profile.yearOfStudy}
                </Badge>
              )}
            </div>
            
            {profile.lookingFor && (
              <p className="text-sm mt-1 flex items-center">
                <Heart className="w-3 h-3 mr-1 text-pink-200" />
                Looking for: {profile.lookingFor === 'dating' ? 'Dating 💘' : 
                              profile.lookingFor === 'friends' ? 'Friends 🤝' : 'Both 🌟'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Bio Section */}
      <div className="p-4 bg-white dark:bg-slate-950 flex-grow overflow-auto">
        {profile.bio ? (
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {profile.bio}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Your bio will appear here...
          </p>
        )}
        
        {/* Interests/Tags */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">INTERESTS</h4>
            <div className="flex flex-wrap gap-1">
              {profile.interests.map((interest, i) => (
                <Badge key={i} className="bg-pink-100 hover:bg-pink-200 text-pink-700 border-transparent text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Lifestyle Section */}
        {(hasCompleted('workoutFrequency') || hasCompleted('drinkingPreference') || 
          hasCompleted('socialMediaUsage') || hasCompleted('sleepingHabits')) && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
              <Coffee className="w-3 h-3 mr-1" />
              LIFESTYLE
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {profile.workoutFrequency && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Workout:</span> {profile.workoutFrequency}
                </div>
              )}
              {profile.drinkingPreference && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Drinking:</span> {profile.drinkingPreference}
                </div>
              )}
              {profile.sleepingHabits && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Sleep:</span> {profile.sleepingHabits}
                </div>
              )}
              {profile.socialMediaUsage && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Social media:</span> {profile.socialMediaUsage}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Personality Section */}
        {(hasCompleted('personalityType') || hasCompleted('communicationStyle') || 
          hasCompleted('loveLanguage') || hasCompleted('zodiacSign')) && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
              <Stars className="w-3 h-3 mr-1" />
              PERSONALITY
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {profile.personalityType && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Personality:</span> {profile.personalityType}
                </div>
              )}
              {profile.communicationStyle && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Communication:</span> {profile.communicationStyle}
                </div>
              )}
              {profile.loveLanguage && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Love language:</span> {profile.loveLanguage.replace('_', ' ')}
                </div>
              )}
              {profile.zodiacSign && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Zodiac:</span> {profile.zodiacSign}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Social Links */}
        {(profile.instagram || profile.spotify || profile.snapchat) && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">SOCIAL</h4>
            <div className="flex flex-wrap gap-2">
              {profile.instagram && (
                <Badge variant="outline" className="text-xs py-0 border-pink-200 dark:border-pink-800">
                  📸 Instagram
                </Badge>
              )}
              {profile.spotify && (
                <Badge variant="outline" className="text-xs py-0 border-pink-200 dark:border-pink-800">
                  <Music className="w-3 h-3 mr-1" /> Spotify
                </Badge>
              )}
              {profile.snapchat && (
                <Badge variant="outline" className="text-xs py-0 border-pink-200 dark:border-pink-800">
                  👻 Snapchat
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Profile Actions */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-center gap-3">
        <button className="rounded-full p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
          <MessageSquare className="w-4 h-4" />
        </button>
        <button className="rounded-full p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
          <Heart className="w-4 h-4" />
        </button>
        <div className="text-xs text-gray-500 dark:text-gray-400 self-center ml-2">Interactive demo</div>
      </div>
    </div>
  );
} 