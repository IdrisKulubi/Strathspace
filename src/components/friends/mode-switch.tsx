"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Heart, Users } from "lucide-react";
import { toggleProfileMode, type ProfileMode } from "@/lib/actions/profile-modes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ModeSwitchProps {
  initialModes: {
    datingEnabled: boolean;
    friendsEnabled: boolean;
    datingProfileCompleted: boolean;
    friendsProfileCompleted: boolean;
  };
}

export function ModeSwitch({ initialModes }: ModeSwitchProps) {
  const router = useRouter();
  const [modes, setModes] = useState(initialModes);
  const [isLoading, setIsLoading] = useState<ProfileMode | null>(null);

  const handleModeToggle = async (mode: ProfileMode) => {
    try {
      setIsLoading(mode);
      const updatedModes = await toggleProfileMode(mode);
      setModes(updatedModes);

      // If enabling a mode and profile is not complete, redirect to setup
      if (mode === "dating" && !modes.datingProfileCompleted && updatedModes.datingEnabled) {
        router.push("/profile/setup?mode=dating");
      } else if (mode === "friends" && !modes.friendsProfileCompleted && updatedModes.friendsEnabled) {
        router.push("/friends/setup?mode=friends");
      }

      toast.success(`${mode === "dating" ? "Dating" : "Friends"} mode ${updatedModes[mode === "dating" ? "datingEnabled" : "friendsEnabled"] ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update mode settings");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white/50 dark:bg-background/50 backdrop-blur-xl rounded-3xl border border-pink-100 dark:border-pink-950">
      <h2 className="text-2xl font-semibold">Connection Modes</h2>
      
      <div className="space-y-4">
        {/* Dating Mode Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">
              <Heart className="w-4 h-4 inline-block mr-2 text-pink-500" />
              Dating Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Find romantic connections
            </p>
          </div>
          <Switch
            checked={modes.datingEnabled}
            onCheckedChange={() => handleModeToggle("dating")}
            disabled={isLoading !== null}
          />
        </div>

        {/* Friends Mode Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">
              <Users className="w-4 h-4 inline-block mr-2 text-blue-500" />
              Friends Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Connect with study buddies
            </p>
          </div>
          <Switch
            checked={modes.friendsEnabled}
            onCheckedChange={() => handleModeToggle("friends")}
            disabled={isLoading !== null}
          />
        </div>

        {/* Incomplete Profile Alerts */}
        {modes.datingEnabled && !modes.datingProfileCompleted && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dating Profile Incomplete</AlertTitle>
            <AlertDescription>
              Complete your dating profile to start matching.{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => router.push("/profile/setup?mode=dating")}
              >
                Complete Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {modes.friendsEnabled && !modes.friendsProfileCompleted && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Friends Profile Incomplete</AlertTitle>
            <AlertDescription>
              Complete your friends profile to start connecting.{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => router.push("/friends/setup?mode=friends")}
              >
                Complete Now
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
} 