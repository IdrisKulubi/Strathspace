"use client";

import Image from "next/image";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function MobileNavbar() {
  const router = useRouter();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-12 bg-[#23272f] flex items-center justify-between px-4 shadow-md border-b border-black/10">
      {/* Strathspace Logo */}
      <div className="flex items-center gap-2">
        <Image src="/LOGO.png"
         alt="Strathspace Logo" 
         width={32} 
         height={32} 
         className="rounded-full"
         />
        <span className="text-xl font-bold text-[rgb(255,88,230)] tracking-tight select-none">strathspace</span>
      </div>
      
      {/* StrathSpeed Quick Access */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={() => router.push('/strathspeed')}
          variant="ghost"
          size="sm"
          className="h-8 px-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/20 text-pink-400 hover:text-pink-300 transition-all duration-200"
        >
          <Zap className="h-4 w-4 mr-1" fill="currentColor" />
          <span className="text-xs font-medium">Speed Dating</span>
        </Button>
      </motion.div>
    </nav>
  );
} 