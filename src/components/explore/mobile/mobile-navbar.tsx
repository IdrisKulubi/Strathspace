"use client";

import Image from "next/image";
export function MobileNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-12 bg-[#23272f] flex items-center justify-between px-4 shadow-md border-b border-black/10">
      {/* Tinder Logo */}
      <div className="flex items-center gap-2">
        <Image src="/LOGO.png"
         alt="Strathspace Logo" 
         width={32} 
         height={32} 
         className="rounded-full"

         />
        <span className="text-xl font-bold text-[rgb(255,88,230)]    tracking-tight select-none">strathspace</span>
      </div>
     
    </nav>
  );
} 