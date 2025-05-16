"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/db/schema";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { ChevronLeft, X } from "lucide-react";

export function ChatHeader({ partner, onClose }: { partner?: Profile | null, onClose: () => void }) {
  // Fallback values
  const firstName = partner?.firstName || "";
  const lastName = partner?.lastName || "";
  const yearOfStudy = partner?.yearOfStudy || "";
  const course = partner?.course || "";
  const router = useRouter();
  
  // Generate initials safely
  const firstInitial = firstName ? firstName[0] : "";
  const lastInitial = lastName ? lastName[0] : "";
  const hasInitials = !!(firstInitial || lastInitial);

  // Handle both close and navigation to ensure it works in all contexts
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Try the provided onClose first
    if (onClose) {
      onClose();
    } else {
      // Fallback to router if onClose is not provided or doesn't work
      router.push('/explore');
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
      <div className="flex items-center">
        <Link
          href="/explore"
          className="mr-2 p-1.5 hover:bg-accent rounded-full transition-colors"
        >
          <ChevronLeft className="h-7 w-7" />
        </Link>
        <Avatar className="h-10 w-10">
          {partner?.profilePhoto ? (
            <AvatarImage src={partner.profilePhoto} />
          ) : (
            <Skeleton className="h-full w-full rounded-full" />
          )}
          <AvatarFallback>
            {hasInitials ? `${firstInitial}${lastInitial}` : "👤"}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h2 className="font-semibold">
            {firstName} {lastName}
          </h2>
          {(yearOfStudy || course) ? (
            <p className="text-sm text-muted-foreground">
              {yearOfStudy && `${yearOfStudy} Year`} {course && `- ${course}`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          )}
        </div>
      </div>
      
      <button
        onClick={handleClose}
        className="p-2.5 hover:bg-accent rounded-full transition-colors active:bg-accent/80 touch-manipulation"
        aria-label="Close chat"
        type="button"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
} 