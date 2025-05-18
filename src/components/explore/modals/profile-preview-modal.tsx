import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Profile } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon } from "lucide-react";

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
}

export function ProfilePreviewModal({
  isOpen,
  onClose,
  profile,
}: ProfilePreviewModalProps) {
  if (!profile) {
    return null;
  }

  // Check if profile is anonymous
  const isAnonymous = profile.anonymous;
  const anonymousAvatar = isAnonymous ? profile.anonymousAvatar : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-gradient-to-b from-white to-purple-50 dark:from-background dark:to-purple-950/20">
          <DialogHeader>
            <DialogTitle className="text-center mb-4 text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-200 font-bold">
              {isAnonymous ? "Anonymous Profile" : "Profile Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Photos Gallery */}
            <div className="relative h-72 overflow-hidden rounded-xl ring-2 ring-purple-200 dark:ring-purple-800 shadow-lg">
              {isAnonymous ? (
                // Anonymous avatar display
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-black">
                  {anonymousAvatar ? (
                    <Image
                      src={`/avatars/${anonymousAvatar}.svg`}
                      alt="Anonymous avatar"
                      width={150}
                      height={150}
                      className="opacity-80"
                      priority
                    />
                  ) : (
                    <UserIcon className="w-32 h-32 text-white opacity-70" />
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge 
                      variant="outline" 
                      className="bg-black/50 text-white border-white/20 backdrop-blur-sm"
                    >
                      Anonymous
                    </Badge>
                  </div>
                </div>
              ) : (
                // Regular photos gallery
                <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory h-full">
                  {profile.photos?.map((photo, i) => (
                    <div
                      key={i}
                      className="relative flex-none w-full snap-center"
                    >
                      <Image
                        src={photo}
                        alt={`${profile.firstName}'s photo ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute bottom-2 right-2">
                        <Badge
                          variant="secondary"
                          className="bg-black/50 text-white backdrop-blur-sm"
                        >
                          {i + 1}/{profile.photos?.length}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4 px-1">
              <div>
                {isAnonymous ? (
                  <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-200">
                    Anonymous User
                    <p className="text-sm text-muted-foreground mt-1">
                      This user has chosen to remain anonymous. Their identity will be revealed when both of you agree.
                    </p>
                  </h3>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-200">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-muted-foreground font-medium">
                      {profile.course} • Year {profile.yearOfStudy}
                    </p>
                  </>
                )}
              </div>

              {/* Bio - show even for anonymous users */}
              {profile.bio && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-1 text-purple-600 dark:text-purple-300">
                    About
                  </h4>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Interests - show even for anonymous users */}
              {profile.interests && profile.interests.length > 0 && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-purple-600 dark:text-purple-300">
                    Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests?.map((interest, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-800/50 transition-colors"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Anonymous Mode Message */}
              {isAnonymous && (
                <div className="bg-purple-100/50 dark:bg-purple-950/30 p-4 rounded-lg text-center mt-4">
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    Use the &quot;Reveal Identity&quot; button in chat to request seeing this user&apos;s real profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
}
