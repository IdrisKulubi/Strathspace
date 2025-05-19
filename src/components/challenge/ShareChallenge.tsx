"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Instagram, Copy, Send } from 'lucide-react'; // Using Send for WhatsApp as a general message icon
import React from 'react'; // Ensure React is imported for FC and ReactElement

interface ShareChallengeProps {
  shareUrl: string;
  baseText: string;
  onClose?: () => void; // Optional: to close the share options
}

// Simplified WhatsApp icon using an SVG path for better recognition
const WhatsAppIcon = (): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M12.04 22.0002C6.58001 22.0002 2.14001 17.5602 2.14001 12.1002C2.14001 9.00018 3.72001 6.24018 6.00001 4.60018L6.66001 4.18018L2.34001 5.58018L3.88001 1.20018L3.80001 1.28018L4.24001 1.90018C5.82001 3.70018 8.00001 5.44018 10.06 5.00018C10.34 4.92018 10.62 4.86018 10.90 4.82018C11.22 4.78018 11.52 4.76018 11.84 4.76018C11.90 4.76018 11.96 4.76018 12.02 4.76018L12.04 4.76018H12.06C17.52 4.76018 21.96 9.20018 21.96 14.6602C21.9445 17.7003 20.4044 20.4139 18.19 21.9802L18.16 22.0002H18.12L12.04 22.0002Z" transform="translate(0 -2.5) scale(1.15)"/>
    <path d="M16.72 14.9202C16.72 14.9202 16.06 16.2402 15.14 16.3802C14.8038 16.4306 14.461 16.4323 14.12 16.3852C13.68 16.3252 13.06 16.0652 12.36 15.4852C11.8274 15.0284 11.3691 14.5014 10.98 13.9202C10.6605 13.4373 10.4144 12.9028 10.25 12.3402C10.04 11.6602 9.80001 10.9202 10.14 10.5002C10.38 10.1802 10.84 10.1002 11.16 10.1002C11.38 10.1002 11.58 10.1002 11.76 10.3202C11.98 10.5802 12.14 10.9602 12.22 11.1402C12.32 11.3602 12.36 11.5402 12.28 11.7802C12.18 12.0402 11.76 12.5202 11.52 12.7802C11.4022 12.9092 11.3055 13.0561 11.23 13.2202C11.2865 13.4112 11.3813 13.5905 11.51 13.7502C11.9418 14.2513 12.4712 14.6599 13.06 14.9602C13.292 15.0922 13.546 15.1862 13.81 15.2402C14.02 15.2802 14.24 15.2802 14.44 15.1202C14.68 14.9202 15.04 14.3802 15.14 14.1202C15.24 13.8802 15.32 13.7002 15.52 13.6202C15.78 13.5002 16.16 13.5002 16.72 13.7202L16.72 14.9202Z" transform="translate(0 -2.5) scale(1.15)"/>
  </svg>
);

export const ShareChallenge: React.FC<ShareChallengeProps> = ({ shareUrl, baseText, onClose }) => {
  const [copied, setCopied] = useState(false);
  const fullShareText = `${baseText} ${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Maybe show an error toast to the user
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(fullShareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleInstagramShare = () => {
    // Instagram direct sharing with pre-filled text is not directly possible from web.
    // Best approach is to copy the text and prompt user to open Instagram.
    handleCopy(); // Copy the text first
    // Optionally, you can try to open Instagram app or website
    // window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
    alert("Text copied for Instagram! Open Instagram and paste it in your Story or post. ✨");
  };
  
  // Placeholder for Snapchat - similar limitations to Instagram for web sharing
  const handleSnapchatShare = () => {
    handleCopy();
    alert("Text copied for Snapchat! Open Snapchat and paste it. 👻");
  };

  return (
    <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border border-pink-200 dark:border-pink-700/50 space-y-3 animate-slide-up">
      <h3 className="text-lg font-semibold text-center text-pink-600 dark:text-pink-400 mb-3">Share the Fun! 🎉</h3>
      
      <Button
        onClick={handleWhatsAppShare}
        variant="outline"
        className="w-full justify-center gap-2 border-green-500 text-green-600 hover:bg-green-500/10 hover:text-green-700 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400/10 dark:hover:text-green-300"
      >
        <WhatsAppIcon /> WhatsApp
      </Button>

      <Button
        onClick={handleInstagramShare}
        variant="outline"
        className="w-full justify-center gap-2 border-pink-500 text-pink-600 hover:bg-pink-500/10 hover:text-pink-700 dark:border-pink-400 dark:text-pink-400 dark:hover:bg-pink-400/10 dark:hover:text-pink-300"
      >
        <Instagram className="h-5 w-5" /> Instagram
      </Button>
      
      <Button
        onClick={handleSnapchatShare}
        variant="outline"
        className="w-full justify-center gap-2 border-yellow-400 text-yellow-500 hover:bg-yellow-400/10 hover:text-yellow-600 dark:border-yellow-300 dark:text-yellow-300 dark:hover:bg-yellow-300/10 dark:hover:text-yellow-200"
      >
        <Send className="h-5 w-5 -rotate-45" /> {/* Using Send icon as a placeholder for Snapchat */}
        Snapchat
      </Button>

      <Button
        onClick={handleCopy}
        variant="outline"
        className="w-full justify-center gap-2 border-purple-500 text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400/10 dark:hover:text-purple-300"
      >
        <Copy className="h-5 w-5" /> {copied ? 'Copied!' : 'Copy Link & Text'}
      </Button>

      {onClose && (
         <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="w-full text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 mt-2"
          >
            Close
        </Button>
      )}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
        Tip: For IG & Snap, paste the copied text into your story or post!
      </p>
    </div>
  );
}; 