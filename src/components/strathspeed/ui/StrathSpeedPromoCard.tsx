'use client';

import { motion } from 'framer-motion';
import { Zap, Users, Video, Heart, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface StrathSpeedPromoCardProps {
  onDismiss?: () => void;
  className?: string;
}

export function StrathSpeedPromoCard({ onDismiss, className }: StrathSpeedPromoCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const router = useRouter();

  const handleJoinNow = () => {
    setIsPressed(true);
    setTimeout(() => {
      router.push('/strathspeed');
    }, 150);
  };

  const features = [
    { icon: Clock, text: "90-second dates", color: "text-blue-400" },
    { icon: Video, text: "Live video chat", color: "text-green-400" },
    { icon: Heart, text: "Find matches fast", color: "text-pink-400" },
  ];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        duration: 0.6
      }}
      className={className}
    >
      <Card className="relative overflow-hidden border-2 border-transparent bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-sm">
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            backgroundSize: '200% 200%',
          }}
        />
        
        {/* Sparkling effects */}
        <div className="absolute top-2 right-2">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </motion.div>
        </div>

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="h-5 w-5 text-white" fill="currentColor" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                StrathSpeed Dating
              </h3>
              <p className="text-sm text-muted-foreground">New feature! 🎉</p>
            </div>
            <motion.div
              className="ml-auto"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Users className="h-6 w-6 text-purple-500" />
            </motion.div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Experience lightning-fast connections! Join our speed dating room for quick 90-second video dates. 
            <span className="text-pink-500 font-medium"> Perfect for breaking the ice!</span>
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
              >
                <feature.icon className={`h-4 w-4 mx-auto mb-1 ${feature.color}`} />
                <p className="text-xs font-medium text-muted-foreground">{feature.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleJoinNow}
                className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium shadow-lg transition-all duration-200 ${
                  isPressed ? 'scale-95' : ''
                }`}
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" fill="currentColor" />
                Join Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
            
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Later
              </Button>
            )}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            <motion.div
              className="h-2 w-2 rounded-full bg-green-500"
              animate={{
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Live now • Join other students
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 