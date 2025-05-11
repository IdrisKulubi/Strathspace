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
import { FeedbackModal } from "./feedback-modal";

interface DesktopNavProps {
  className?: string;
}

export function DesktopNav({ className = "" }: DesktopNavProps) {
  const { data: session } = useSession();

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-lg z-50 ${className}`}
    >
      <div className="container h-full mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          ValSpace
        </Link>

        <div className="flex items-center gap-4">
          <FeedbackModal />
          
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={session.user?.image || undefined}
                      alt={session.user?.name || "User avatar"}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
