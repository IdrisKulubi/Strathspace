"use client";

import { useState, useEffect } from "react";
import { HeartCrack } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitFeedback } from "@/lib/actions/feedback.actions";
import { motion } from "framer-motion";
import { getAppStats, type StatsData } from "@/lib/actions/stats.actions";

// Helper component for animated numbers
function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

interface FeedbackModalProps {
  autoShow?: boolean;
}

export function FeedbackModal({ autoShow = false }: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [stats, setStats] = useState<StatsData>({
    matches: 0,
    swipes: 0,
    users: 0
  });

  // Auto-show modal when component mounts if autoShow is true
  useEffect(() => {
    if (autoShow) {
      setIsOpen(true);
    }
  }, [autoShow]);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getAppStats();
      setStats(data);
    };

    // Initial fetch
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!message.trim()) {
      toast({
        title: "Bruh... 🥲",
        description: "Type something before sending! I'm not a mind reader.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (/^(hi|hello|hey)/i.test(message)) {
      toast({
        title: "No cap 🧢",
        description: "Skip the greetings fam - just drop the issue!",
        variant: "destructive",
      });
      setIsSubmitting(true);
      return;
    }

    try {
      const result = await submitFeedback(
        message,
        name || undefined,
        phoneNumber || undefined
      );
      if (result.error) throw new Error(result.error);

      toast({
        title: "Bet 🫶",
        description: "Your issue's been yeeted to my todo list!",
      });

      setMessage("");
      setName("");
      setPhoneNumber("");
    } catch (error) {
      console.error("RIP feedback:", error);
      toast({
        title: "Big oof 😬",
        description: "My servers are crying rn - try again?",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Show button only if not autoShow */}
      {!autoShow && (
        <button onClick={() => setIsOpen(true)} className="relative group">
          <div className="transform transition-transform hover:scale-110">
            <HeartCrack className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500/90 hover:text-rose-400 transition-colors" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 bg-purple-500 rounded-full ring-2 ring-background transform scale-0 group-hover:scale-100 transition-transform" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 flex items-start justify-center z-50 pointer-events-none p-2 sm:p-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out pointer-events-auto" />

          <div className="relative w-full max-w-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-white/10 z-900 backdrop-blur-lg mx-auto transform transition-all duration-300 ease-in-out pointer-events-auto mt-16 max-h-[85vh] overflow-y-auto">
            {/* Header - Now with close button */}
            <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 backdrop-blur-xl p-4 rounded-t-xl border-b border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="text-3xl sm:text-4xl animate-bounce">🎉</div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                      Y&apos;all Went Crazy This Season 🔥
                    </h2>
                    <span className="text-sm sm:text-base text-fuchsia-200/90">In that short time, we had </span>
                    <p className="text-sm sm:text-base text-fuchsia-200/90">
                      <AnimatedNumber value={stats.matches} /> matches •{' '}
                      <AnimatedNumber value={stats.swipes} /> swipes •{' '}
                      <AnimatedNumber value={stats.users} /> glowups
                    </p> 
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-300 hover:text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Remove ScrollArea component and its wrapper */}
            <div className="px-4">
              <div className="space-y-4 py-4">
                {/* Event Announcement */}
                <div className="bg-purple-50/30 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="text-center space-y-2">
                    <div className="text-lg font-medium">
                      🚨 STRATHSPACE FUN DAY 🎪
                    </div>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-pink-300">FIRST STOP:</span> Strathmore Edition 
                        → Then All Unis will join in the fun day edition 
                      </div>
                      <div className="space-y-1">
                        🔥 RedBull Fueled • 🎤 Live Sets • 🕺 TikTok Battles<br/>
                        📸 Insta-Worthy Zones • 🎁 Crazy Giveaways<br/>
                        💘 Speed Dating Sessions • 💑 Match Meetups<br/>
                        💼 Student Business Showcase (Free Booths!)<br/>
                          Karaoke • 🎨 Art Exhibitions<br/>
                        🎭 Talent Shows • 🍔 Food Festival • 💃 Dance Battles
                        <span className="text-sm opacity-75 text-yellow-400"> And more others,Also  you can suggest in the feedback</span>
                      </div>
                      <div className="text-xs mt-2 text-emerald-300">
                        FREE Business Showcase for Student Entrepreneurs
                      </div>
                      <div className="text-xs mt-2">
                        Partners: <span className="text-red-500">REDBULL</span> • 
                        <span className="text-blue-400"> NIVEA</span>  •
                        <span className="text-yellow-400"> 
                          <span className="text-yellow-400">Tropical Heat</span>•
                          [Gosh I can&apos;t name them all 😫]</span>
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        🎟️ No Tickets Needed - Your StrathSpaceProfile IS Your Entry!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile App Update */}
                <div className="flex items-start gap-3 bg-pink-50/30 dark:bg-pink-900/20 rounded-lg p-4">
                  <span className="text-xl flex-shrink-0">📱</span>
                  <div className="space-y-1">
                    <strong>App Drop Countdown ⏳ will launch that day</strong>
                    <div className="text-sm">
                      iOS/Android version cooking 🧑💻<br/>
                      <span className="text-xs opacity-75">
                        (Low-key gonna make Tinder sweat 😅)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registration CTA */}
                <div className="bg-gradient-to-r from-rose-500/30 to-pink-500/30 rounded-lg p-4 text-center">
                  <button 
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-2 rounded-lg hover:shadow-[0_0_20px_rgba(255,65,106,0.5)] transition-shadow"
                  >
                    🚨 Watch out for Event Updates 🚨
                  </button>
                  <p className="text-xs mt-2 opacity-75">
                    (We&pos;ll slide into your DMs with deets)
                  </p>
                </div>

                {/* Homepage Rebranding Contest */}
                <div className="flex items-start gap-3 bg-emerald-50/30 dark:bg-emerald-900/20 rounded-lg p-4">
                  <span className="text-xl flex-shrink-0">💰</span>
                  <div className="space-y-2">
                    <strong className="text-emerald-300">Win 10K Cash 🏆</strong>
                    <div className="text-sm space-y-1">
                      <p>Help us rebrand our homepage We&apos;re looking for:</p>
                      <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                        <li>Fresh design ideas</li>
                        <li>Catchy slogans</li>
                        <li>New feature suggestions</li>
                        <li>Vibe improvements</li>
                      </ul>
                      <p className="text-xs mt-2 text-yellow-300">
                        Drop your ideas in the feedback box below 👇
                        <br/>
                        <span className="opacity-75">
                          (Best suggestion wins the bag 💸)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="flex items-start gap-3 bg-purple-50/30 dark:bg-purple-900/20 rounded-lg p-4">
                  <span className="text-xl flex-shrink-0">👑</span>
                  <div className="space-y-1">
                    <strong>Y&apos;all Rule</strong>
                    <div className="text-sm">
                      This app&apos;s yours Demand features below or if you have any suggestions
                      👇
                      <div className="text-xs opacity-75 mt-1">
                        (I&apos;m just your tech bestie 🛠️)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Form */}
                <form onSubmit={handleSubmit} className="space-y-3 mt-6">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border bg-black/20 px-3 py-2 text-sm ring-offset-background placeholder:text-rose-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30"
                  />
                  <input
                    type="tel"
                    placeholder="Your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-md border bg-black/20 px-3 py-2 text-sm ring-offset-background placeholder:text-rose-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30"
                  />
                  <textarea
                    placeholder="Leave me a message ..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-md border bg-black/20 px-3 py-2 text-sm ring-offset-background placeholder:text-rose-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 min-h-[100px] resize-none"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm hover:shadow-[0_0_20px_rgba(255,65,106,0.3)] py-2 px-4 transition-all duration-300 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin">🔄</span>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Send Feedback</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
