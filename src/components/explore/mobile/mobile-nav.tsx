"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import { FeedbackModal } from "@/components/shared/feedback-modal";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className = '' }: MobileNavProps) {
  const { data: session } = useSession();

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-lg border-b border-pink-100 dark:border-pink-900 ${className}`}>
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/matches" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
            Strathspace 💝
          </span>
        </Link>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2">
          {session?.user && (
            <Button
              variant="ghost"
              size="icon"
              className="text-pink-500"
              asChild
            >
              <Link href="/matches">
                <span className="text-sm">Explore</span>
              </Link>
            </Button>
          )}

          {/* Dropdown Menu for Profile and Sign Out */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white">
                    {session?.user?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 border border-border bg-background/80 backdrop-blur-sm shadow-lg rounded-lg"
            >
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-purple-500/10 hover:text-primary transition-colors"
                >
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <FeedbackModal />
          </div>
        </div>
      </div>
    </div>
  );
}
