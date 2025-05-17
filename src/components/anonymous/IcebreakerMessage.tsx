"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from "lucide-react";

interface IcebreakerMessageProps {
  prompt: string;
  onSend: (message: string) => void;
}

export function IcebreakerMessage({ prompt, onSend }: IcebreakerMessageProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    try {
      setIsSending(true);
      await onSend(prompt);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-start gap-2 mb-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <div className="flex-1 bg-primary/5 border border-primary/10 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-primary mb-2 font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          Icebreaker Prompt
        </div>
        <p className="text-sm">{prompt}</p>
        <div className="flex justify-end mt-2">
          <Button 
            size="sm" 
            onClick={handleSend}
            disabled={isSending}
            className="text-xs gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
} 