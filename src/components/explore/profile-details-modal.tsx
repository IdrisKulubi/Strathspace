'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ImageSlider from './controls/ImageSlider';

interface ProfileDetailsModalProps {
  profile: {
    firstName?: string;
    age?: number;  
    course?: string;
    yearOfStudy?: number;
    bio?: string;
    interests?: string[];
    photos?: string[];
    profilePhoto?: string;
    lookingFor?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
};

export function ProfileDetailsModal({ profile, isOpen, onClose }: ProfileDetailsModalProps) {

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end md:items-center justify-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl bg-background/95 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] border border-pink-200/20"
            variants={modalVariants}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Updated with mobile-friendly padding */}
            <div className="p-3 md:p-4 border-b border-pink-200/20 flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-purple-500/10 backdrop-blur-sm">
              <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                {profile.firstName}&apos;s Profile
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 rounded-full hover:bg-pink-500/20 transition-colors"
                aria-label="Close profile details"
              >
                <X className="h-5 w-5 md:h-6 md:w-6 text-pink-500" />
              </button>
            </div>

            {/* Scrollable Content - Updated padding and spacing */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                {/* Image Slider - Adjusted for mobile */}
                <div className="relative aspect-[3/4] w-full max-w-sm mx-auto rounded-xl md:rounded-2xl overflow-hidden shadow-xl ring-2 ring-pink-500/20">
                  <ImageSlider
                    slug={[
                      profile.profilePhoto || "",
                      ...(profile.photos || []),
                    ].filter(Boolean)}
                    className="h-full object-cover"
                  />
                </div>

                {/* Looking For Section - Adjusted padding */}
                {profile.lookingFor && (
                  <div className="relative p-4 md:p-6 rounded-xl md:rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-200/20 shadow-inner">
                    <div className="absolute -top-3 left-4 px-3 py-0.5 bg-background rounded-full border border-pink-200/20">
                      <span className="text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Looking For
                      </span>
                    </div>
                    <p className="text-lg md:text-xl font-semibold text-center mt-1 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                      {profile.lookingFor}
                    </p>
                  </div>
                )}

                {/* Details Section - Updated grid for mobile */}
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <DetailItem label="Age" value={profile.age?.toString() || ''} />
                    <DetailItem label="Year" value={`Year ${profile.yearOfStudy}`} />
                    <DetailItem label="Course" value={profile.course || ''} span={2} />
                  </div>

                  {profile.interests && profile.interests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-pink-400">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest) => (
                          <span
                            key={interest}
                            className="px-4 py-1.5 text-sm rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-200/20 text-pink-400"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.bio && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-pink-400">Bio</h3>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 bg-gradient-to-r from-pink-500/5 to-purple-500/5 p-4 rounded-xl border border-pink-200/10">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailItem({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div className={`p-3 md:p-4 rounded-lg md:rounded-xl bg-gradient-to-r from-pink-500/5 to-purple-500/5 border border-pink-200/10 ${span === 2 ? 'col-span-full sm:col-span-2' : ''}`}>
      <p className="text-sm text-pink-400">{label}</p>
      <p className="font-medium text-foreground/90">{value}</p>
    </div>
  );
} 