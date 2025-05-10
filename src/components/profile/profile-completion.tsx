"use client";

import { useState } from "react";
import { 
  calculateProfileCompletion, 
  IncompleteSection,
  getCompletionMessage
} from "@/lib/utils/profile-completion";
import { ProfileFormData } from "@/lib/actions/profile.actions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronRight, Edit, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileCompletionProps {
  profile: Partial<ProfileFormData>;
  onSectionClick?: (sectionId: string) => void;
}

export function ProfileCompletion({ profile, onSectionClick }: ProfileCompletionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { percentage, incompleteSections } = calculateProfileCompletion(profile);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSectionClick = (sectionId: string) => {
    if (onSectionClick) {
      onSectionClick(sectionId);
    }
  };

  // Function to determine color class based on percentage
  const getColorClass = (percent: number) => {
    if (percent < 30) return "bg-red-500";
    if (percent < 60) return "bg-amber-500";
    if (percent < 90) return "bg-blue-500";
    return "bg-green-500";
  };

  // Animation variants
  const containerVariants = {
    collapsed: { height: 'auto' },
    expanded: { height: 'auto' }
  };

  const listVariants = {
    collapsed: { opacity: 0, height: 0 },
    expanded: { opacity: 1, height: 'auto' }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl border border-pink-100 dark:border-pink-950 shadow-sm overflow-hidden">
      <motion.div 
        className="w-full"
        variants={containerVariants}
        initial="collapsed"
        animate={isExpanded ? "expanded" : "collapsed"}
        transition={{ duration: 0.3 }}
      >
        {/* Header section with percentage and progress bar */}
        <div 
          className="px-4 py-3 flex items-center justify-between cursor-pointer"
          onClick={toggleExpanded}
        >
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={2 * Math.PI * 18 * (1 - percentage / 100)}
                  strokeLinecap="round"
                  className={getColorClass(percentage)}
                  transform="rotate(-90 20 20)"
                />
              </svg>
              <span className="absolute text-xs font-semibold">
                {percentage}%
              </span>
            </div>
            <div>
              <h3 className="font-semibold">Profile Completion</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{getCompletionMessage(percentage)}</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <Progress value={percentage} className={`h-2 ${getColorClass(percentage)}`} />
        </div>

        {/* Expandable section with incomplete items */}
        <motion.div
          variants={listVariants}
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          transition={{ duration: 0.3 }}
        >
          {incompleteSections.length > 0 ? (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <div className="p-4">
                <h4 className="text-sm font-medium mb-2">Complete these sections to improve your profile:</h4>
                <ul className="space-y-2">
                  {incompleteSections.map((section) => (
                    <li key={section.id} 
                      className="bg-pink-50 dark:bg-pink-950/30 rounded-lg py-2 px-3 flex items-center justify-between cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-950/50 transition-colors"
                      onClick={() => handleSectionClick(section.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{section.label}</span>
                      </div>
                      <div className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                        +{section.weight}%
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Your profile is complete! Looking great 🎉</span>
            </div>
          )}

          {incompleteSections.length > 0 && (
            <div className="px-4 pb-4">
              <Button 
                variant="default" 
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
                onClick={() => incompleteSections[0] && handleSectionClick(incompleteSections[0].id)}
              >
                Improve Your Profile
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
} 