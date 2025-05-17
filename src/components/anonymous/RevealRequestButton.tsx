"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Eye, Check, Loader2 } from "lucide-react";
import { requestRevealIdentity } from "@/lib/actions/anonymous.actions";
import { toast } from "sonner";

export function RevealRequestButton({ 
  matchId,
  hasRequested = false,
}: { 
  matchId: string;
  hasRequested?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(hasRequested);
  const [isPending, setIsPending] = useState(false);
  
  const handleRequest = async () => {
    setIsPending(true);
    
    try {
      const result = await requestRevealIdentity(matchId);
      
      if (result.error) {
        toast.error(result.error);
        setOpen(false);
        return;
      }
      
      setRequested(true);
      
      if (result.mutualReveal) {
        toast.success("Profiles revealed! You both can now see each other's photos.");
      } else {
        toast.success("Request sent! Waiting for the other person to agree.");
      }
      
      setOpen(false);
    } catch (error) {
      console.error(" Error revealing identity:", error);
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <>
      <Button
        variant={requested ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={requested}
        className="gap-1.5 h-8"
      >
        {requested ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Requested
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" />
            Reveal Identity
          </>
        )}
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reveal your identity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a request to reveal your profile photo and identity.
              Your profile will only be revealed if both you and your match agree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequest} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Send Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 