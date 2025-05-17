import { cn } from "@/lib/utils";
import { AVATARS } from "@/lib/constants";
import Image from "next/image";

type AnonymousAvatarProps = {
  avatarId: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

export function AnonymousAvatar({
  avatarId,
  className,
  size = "md",
}: AnonymousAvatarProps) {
  // Default to a random avatar if none is specified
  const avatar = avatarId && AVATARS.includes(avatarId) 
    ? avatarId 
    : AVATARS[Math.floor(Math.random() * AVATARS.length)];
  
  // Size classes
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };
  
  // Base path to avatars
  const avatarPath = `/avatars/${avatar}.svg`;
  
  return (
    <div 
      className={cn(
        "rounded-full bg-primary/10 flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <Image 
        src={avatarPath} 
        alt={`Anonymous avatar: ${avatar}`}
        className="w-3/4 h-3/4 object-contain"
        width={parseInt(sizeClasses[size].replace("h-", "").replace("w-", ""))}
        height={parseInt(sizeClasses[size].replace("w-", "").replace("h-", ""))}
      />
    </div>
  );
} 