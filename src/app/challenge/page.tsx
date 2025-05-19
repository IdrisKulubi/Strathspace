"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Gift, Share2, UserCheck, Ghost, Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { ShareChallenge } from "@/components/challenge/ShareChallenge";

const laughEmojis = ["😂", "🤣", "😆", "😜", "😝", "😹", "🥳", "😎" ];

interface EmojiStyle {
  id: number;
  emoji: string;
  left: string;
  fontSize: string;
  animation: string;
  transform: string;
}

function useIntersectionObserver(ref: React.RefObject<HTMLElement | null>, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, { threshold: 0.2, ...options });
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

// Animated image component for scroll animations
function AnimatedImage({ 
  src, 
  alt, 
  isVisible, 
  animation = "slide-in-right",
  width = 250, 
  height = 250,
  className = ""
}: { 
  src: string; 
  alt: string; 
  isVisible: boolean;
  animation?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`absolute transition-all duration-1000 pointer-events-none 
      ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
      ${animation === 'slide-in-right' ? 
        (isVisible ? 'translate-x-0' : 'translate-x-full') : 
        (isVisible ? 'translate-y-0' : 'translate-y-full')}
      ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-contain drop-shadow-xl"
      />
    </div>
  );
}

function BackgroundEmojis() {
  const [mountedEmojis, setMountedEmojis] = useState<EmojiStyle[]>([]);

  useEffect(() => {
    const generatedEmojis = Array.from({ length: 15 }).map((_, i) => {
      const randomEmoji = laughEmojis[Math.floor(Math.random() * laughEmojis.length)];
      const randomLeft = Math.random() * 100;
      const randomSize = Math.random() * 4 + 1; // Between 1-5rem
      const randomDuration = Math.random() * 15 + 20; // Between 20-35s
      const randomDelay = Math.random() * 10;
      
      return {
        id: i,
        emoji: randomEmoji,
        left: `${randomLeft}vw`,
        fontSize: `${randomSize}rem`,
        animation: `floatUp ${randomDuration}s linear ${randomDelay}s infinite`,
        transform: `rotate(${Math.random() * 40 - 20}deg)`,
      };
    });
    setMountedEmojis(generatedEmojis);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-30">
      {mountedEmojis.map((styleProps) => (
        <div 
          key={styleProps.id}
          className="absolute text-pink-500/50 dark:text-pink-400/40"
          style={{
            left: styleProps.left,
            top: "-5rem", 
            fontSize: styleProps.fontSize,
            animation: styleProps.animation,
            transform: styleProps.transform,
          }}
        >
          {styleProps.emoji}
        </div>
      ))}
    </div>
  );
}

interface ConfettiParticleStyle {
  id: number;
  backgroundColor: string;
  transform: string;
  animation: string;
}

function ConfettiButton({ children }: { children: React.ReactNode }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [particleStyles, setParticleStyles] = useState<ConfettiParticleStyle[]>([]);

  useEffect(() => {
    if (showConfetti && particleStyles.length === 0) {
      const newParticles = Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        backgroundColor: 
          i % 5 === 0 ? '#ff7bac' : 
          i % 5 === 1 ? '#ffb8d9' : 
          i % 5 === 2 ? '#7b2cbf' : 
          i % 5 === 3 ? '#ff9e00' : 
          '#01cdfe',
        transform: `rotate(${Math.random() * 360}deg) translate(${Math.random() * 50}px, ${Math.random() * -80}px)`,
        animation: `confetti 0.6s ease-out ${i * 0.02}s forwards`
      }));
      setParticleStyles(newParticles);
    }
    if (!showConfetti) {
      setParticleStyles([]);
    }
  }, [showConfetti, particleStyles]); 
  return (
    <div className="relative overflow-hidden">
      <div 
        className={`absolute -z-10 inset-0 ${showConfetti ? 'animate-confetti' : 'opacity-0'}`}
        onAnimationEnd={() => {
          setShowConfetti(false);
        }}
      >
        {particleStyles.map((styleProps) => (
          <div 
            key={styleProps.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              top: '50%',
              left: '50%',
              backgroundColor: styleProps.backgroundColor,
              transform: styleProps.transform,
              opacity: 0, 
              animation: styleProps.animation
            }}
          />
        ))}
      </div>
      <div onMouseEnter={() => setShowConfetti(true)} className="relative">
        {children}
      </div>
    </div>
  );
}

export default function ChallengePage() {
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  // Refs for scroll-based animations
  const anonymousSectionRef = useRef<HTMLDivElement>(null);
  const prizeSectionRef = useRef<HTMLDivElement>(null);
  
  const isAnonymousSectionVisible = useIntersectionObserver(anonymousSectionRef);
  const isPrizeSectionVisible = useIntersectionObserver(prizeSectionRef);

  const prizeDetails = {
    grandPrize: "10000 cash",
    merchWinners: "10 x StrathSpace hoodies or stickers",
  };

  const referralLink = "https://strathspace.com"; 
  const baseShareText = "🎉 Hey! Found this awesome campus challenge on StrathSpace. Join the fun, win prizes, and find your vibe! Check it out:";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-gray-900 dark:via-pink-900/20 dark:to-purple-900/30 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative isolate">
      {/* Background animated emojis */}
      <BackgroundEmojis />
      
      {/* Floating shapes in background for extra flair */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: '7s' }}></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: '10s' }}></div>
      
      <div className="bg-white/80 dark:bg-gray-800/80 shadow-2xl rounded-3xl p-6 sm:p-10 max-w-2xl w-full text-center backdrop-blur-lg border border-pink-200 dark:border-pink-700/50 relative z-10">
        
        <div className="mb-8 relative">
          {/* Sparkle elements */}
          <div className="absolute -top-2 -left-2 text-yellow-400 animate-pulse text-lg" style={{ animationDuration: '1.5s' }}>✨</div>
          <div className="absolute top-1 right-0 text-yellow-400 animate-pulse text-xl" style={{ animationDuration: '2s' }}>✨</div>
          <div className="absolute bottom-0 left-1/4 text-yellow-400 animate-pulse text-lg" style={{ animationDuration: '2.5s' }}>✨</div>
          
          <span className="text-6xl sm:text-8xl animate-wiggle inline-block transition-all hover:scale-125 cursor-pointer">😜</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-pink-600 dark:text-pink-400 mt-4 mb-2 animate-bounce" style={{ animationDuration: '2s' }}>
            Haha, Gotcha!
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300">
            Okay, okay, there&apos;s NO TEA TO SPILL 😭🥴... <span className="font-semibold">BUT</span> you <span className="animate-pulse inline-block text-pink-500">*did*</span> just uncover something even better
          </p>
        </div>

        <div className="space-y-6 mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold relative">
            Ready to Find Your <span className="text-pink-500 dark:text-pink-400 relative">
              Real
              <span className="absolute -top-3 -right-3 text-pink-500 animate-ping">💘</span>
            </span> Campus Vibe? 💘
          </h2>
          <p className="text-md sm:text-lg text-gray-600 dark:text-gray-400">
            Forget the drama! StrathSpace is where you connect with your crew, find study buddies, or maybe even spark something new. <span className="animate-pulse inline-block">✨</span>
          </p>
          <p className="text-md sm:text-lg text-gray-600 dark:text-gray-400">
            Join the fun, create your profile (or go incognito!), and see who you match with!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <ConfettiButton>
            <Link href="/login" passHref>
              <Button size="lg" className="w-full bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 text-white text-lg py-3 rounded-xl shadow-lg transform hover:scale-110 transition-all duration-200 group">
                <UserCheck className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" /> 
                Sign Up & Win! <Sparkles className="ml-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Button>
            </Link>
          </ConfettiButton>
          
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="w-full text-lg py-3 rounded-xl border-pink-500 text-pink-500 hover:bg-pink-500/10 hover:text-pink-600 dark:border-pink-400 dark:text-pink-400 dark:hover:bg-pink-400/10 dark:hover:text-pink-300 shadow-lg transform hover:scale-110 transition-all duration-200 relative overflow-hidden group"
            aria-expanded={showShareOptions}
            aria-controls="share-options"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/30 to-pink-500/0 dark:from-pink-400/0 dark:via-pink-400/20 dark:to-pink-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <Share2 className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" /> 
            {showShareOptions ? 'Close Share' : 'Share for Entries'}
          </Button>
        </div>

        {showShareOptions && (
          <div id="share-options" className="my-6">
            <ShareChallenge 
              shareUrl={referralLink} 
              baseText={baseShareText} 
              onClose={() => setShowShareOptions(false)} 
            />
          </div>
        )}

        <div 
          ref={anonymousSectionRef}
          className="mb-10 p-6 bg-pink-50/70 dark:bg-gray-700/50 rounded-xl border border-pink-200 dark:border-pink-600/50 transform hover:scale-105 transition-transform duration-200 hover:shadow-pink-200/50 dark:hover:shadow-pink-600/30 hover:shadow-lg relative"
        >
          {/* Anonymous mode animated image */}
          <AnimatedImage 
            src="/assets/images/anonymous.jpeg" 
            alt="Anonymous Mode" 
            isVisible={isAnonymousSectionVisible}
            className="-top-20 -right-5 max-w-[200px] md:-top-32 md:-right-32 md:max-w-[280px] lg:max-w-[320px] z-20"
            width={320}
            height={320}
          />
          
          <div className="flex items-center justify-center mb-3">
            <Ghost className="h-7 w-7 text-pink-500 dark:text-pink-400 mr-2 animate-bounce" style={{ animationDuration: '3s' }} /> 
            <h3 className="text-xl font-semibold text-pink-600 dark:text-pink-400">Try Anonymous Mode!</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300 max-w-md mx-auto">
            Not ready to show your face? No worries! Join anonymously and still get a feel for the vibe. Your secret&apos;apos;s safe with us. <span className="inline-block animate-wiggle">😉</span>
          </p>
        </div>
        
        <div 
          ref={prizeSectionRef}
          className="mb-6 p-6 bg-purple-50/70 dark:bg-gray-700/50 rounded-xl border border-purple-200 dark:border-purple-600/50 transform hover:scale-105 transition-transform duration-200 hover:shadow-purple-200/50 dark:hover:shadow-purple-600/30 hover:shadow-lg relative overflow-hidden"
        >
          {/* Prize hoodie animated image */}
          <AnimatedImage 
            src="/assets/images/hoodie.png" 
            alt="StrathSpace Hoodie" 
            isVisible={isPrizeSectionVisible}
            animation="slide-in-right"
            className="bottom-2 left-0 max-w-[130px] md:-left-2 md:max-w-[180px]"
            width={180}
            height={180}
          />
          
          {/* Prize confetti decoration */}
          <div className="absolute -top-3 -right-3 text-2xl animate-wiggle">🎉</div>
          <div className="absolute -bottom-2 -left-3 text-2xl animate-bounce" style={{ animationDuration: '3s' }}>🎁</div>
          
          <div className="flex items-center justify-center mb-3">
            <Gift className="h-7 w-7 text-purple-500 dark:text-purple-400 mr-2 animate-pulse" /> 
            <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400">Epic Prize Draw! 🏆</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-1">Sign up, create a profile, or share the link to win:</p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 text-left pl-4 ml-16 md:ml-20">
            <li>Grand Prize: <span className="font-semibold">{prizeDetails.grandPrize}</span> <span className="text-yellow-500 inline-block animate-pulse">💰</span></li>
            <li>Merch: <span className="font-semibold">{prizeDetails.merchWinners}</span> <span className="inline-block animate-pulse" style={{ animationDelay: '0.4s' }}>👕</span></li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">More entries for referring friends who sign up! Full T&Cs apply.</p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-pink-600 dark:text-pink-400 hover:underline hover:text-pink-700 dark:hover:text-pink-300 transition-colors">
            Back to StrathSpace Home
          </Link>
        </div>

      </div>
      
      <div id="cursor-trail" className="fixed w-6 h-6 rounded-full bg-pink-400/20 pointer-events-none z-50 mix-blend-screen"></div>
    </div>
  );
}

