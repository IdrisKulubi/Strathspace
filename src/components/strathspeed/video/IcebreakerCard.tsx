'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IcebreakerPrompt } from '@/db/schema';

interface IcebreakerCardProps {
  prompt: IcebreakerPrompt;
  onDismiss: () => void;
  className?: string;
}

export function IcebreakerCard({ prompt, onDismiss, className }: IcebreakerCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 200);
  };

  if (!isVisible) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fun':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'deep':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'creative':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'campus':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <Card 
      className={cn(
        "backdrop-blur-md bg-black/60 border-white/20 transition-all duration-200 transform",
        isDismissing ? "scale-95 opacity-0 translate-y-2" : "scale-100 opacity-100",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize", getCategoryColor(prompt.category || 'fun'))}
              >
                {prompt.category || 'Fun'} Question
              </Badge>
              
              <Button
                size="sm"
                variant="ghost"
                className="w-6 h-6 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-white text-sm leading-relaxed">
              {prompt.promptText}
            </p>
          </div>
        </div>
        
        {/* Optional tap to dismiss hint */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-white/50 text-center">
            Tap × to dismiss • This helps break the ice!
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 