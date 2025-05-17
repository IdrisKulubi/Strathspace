"use client";

import { useState, useEffect } from "react";
import { getRandomIcebreaker } from "@/lib/actions/anonymous.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, RefreshCw } from "lucide-react";

interface IcebreakerPromptsProps {
  onSelectPrompt?: (prompt: string) => void;
}

export function IcebreakerPrompts({ onSelectPrompt }: IcebreakerPromptsProps) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial prompt on load
  useEffect(() => {
    fetchNewPrompt();
  }, []);

  const fetchNewPrompt = async () => {
    setIsLoading(true);
    try {
      const result = await getRandomIcebreaker();
      if (result.success && result.prompt) {
        setPrompt(result.prompt);
      }
    } catch (error) {
      console.error("Failed to fetch icebreaker prompt:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = () => {
    if (prompt && onSelectPrompt) {
      onSelectPrompt(prompt);
    }
  };

  return (
    <Card className="mt-4 border border-primary/20">
      <CardHeader className="pb-2 pt-4 bg-primary/5">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Icebreaker Prompt
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-4">
        {prompt ? (
          <>
            <p className="text-sm mb-4">{prompt}</p>
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchNewPrompt}
                disabled={isLoading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                New prompt
              </Button>
              
              {onSelectPrompt && (
                <Button 
                  size="sm" 
                  onClick={handleSelectPrompt}
                  className="gap-1.5"
                >
                  Use this prompt
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 