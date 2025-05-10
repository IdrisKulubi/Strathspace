"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/validators";
import { useToast } from "@/hooks/use-toast";
import { BioInput } from "@/components/shared/profile/bio-input";
import { InterestSelector } from "@/components/shared/profile/interest-selector";
import { DetailsInput } from "@/components/shared/profile/details-input";
import { SocialInput } from "@/components/shared/profile/social-input";
import { LifestyleInput } from "@/components/shared/profile/lifestyle-input";
import { PersonalityInput } from "@/components/shared/profile/personality-input";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import {
  updateProfilePhoto,
  removePhoto,
  type ProfileFormData,
  updateProfile,
} from "@/lib/actions/profile.actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "../shared/profile/image-upload";

interface ProfileFormProps {
  initialData: ProfileFormData;
  activeTab?: any;
}

export function ProfileForm({ initialData, activeTab }: ProfileFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(activeTab || null);
  const [isChanged, setIsChanged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create refs for each section
  const sectionRefs = {
    photos: useRef<HTMLDivElement>(null),
    bio: useRef<HTMLDivElement>(null),
    interests: useRef<HTMLDivElement>(null),
    basicInfo: useRef<HTMLDivElement>(null), // Maps to details section
    courseInfo: useRef<HTMLDivElement>(null), // Also maps to details section
    socialLinks: useRef<HTMLDivElement>(null), // Maps to socials section
    lifestyle: useRef<HTMLDivElement>(null),
    personality: useRef<HTMLDivElement>(null),
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsChanged(true);
    });
    return () => subscription.unsubscribe();
  }, [form, form.watch]);
  
  // Scroll to active section when it changes
  useEffect(() => {
    // Map profile completion sections to form sections
    const sectionMapping: Record<string, string> = {
      photos: "photos",
      bio: "bio",
      interests: "interests",
      basicInfo: "details",
      courseInfo: "details",
      socialLinks: "socials",
      lifestyle: "lifestyle",
      personality: "personality",
    };
    
    if (activeTab && sectionMapping[activeTab]) {
      setActiveSection(sectionMapping[activeTab]);
      
      // Scroll to the section after a short delay to ensure rendering
      setTimeout(() => {
        const section = document.getElementById(`section-${sectionMapping[activeTab]}`);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [activeTab]);

  const handleSubmit = async () => {
    if (!isChanged) return;

    setIsSubmitting(true);
    try {
      const formData = form.getValues();
      const result = await updateProfile(formData);

      if (result.success) {
        setIsChanged(false);
        router.refresh();
        toast({
          title: "Profile updated! ✨",
          description: "Your changes have been saved successfully!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Update failed ☹️",
          description: result.error || "Please try again",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Update failed ☹️",
        description: "Something went wrong. Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldUpdate = async (
    field: keyof Omit<ProfileFormData, "profilePhoto">,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => {
    try {
      form.setValue(field, value);
      setIsChanged(true);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error updating field ☹️",
        description: "Please try again",
      });
    }
  };

  const handlePhotoUpdate = async (photos: string[]) => {
    try {
      form.setValue("photos", photos);
      await handleFieldUpdate("photos", photos);
      router.refresh();
    } catch (error) {
      form.setValue("photos", form.getValues("photos"));
      console.error(error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong with your photos ☹️",
        description: "Failed to update photos. Please try again",
      });
    }
  };

  const handleProfilePhotoUpdate = async (photoUrl: string) => {
    try {
      form.setValue("profilePhoto", photoUrl);
      const result = await updateProfilePhoto(photoUrl);
      if (result.success) {
        router.refresh();
        toast({
          title: "Profile photo updated! ✨",
          description: "Looking good bestie 💝",
        });
      }
    } catch (error) {
      form.setValue("profilePhoto", form.getValues("profilePhoto"));
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to update profile photo ☹️",
        description: "Please try again",
      });
    }
  };

  const handlePhotoRemove = async (photoUrl: string) => {
    try {
      const result = await removePhoto(photoUrl);
      if (result.success) {
        toast({
          title: "Photo removed ✨",
          description: "Photo deleted successfully",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to remove photo ☹️",
        description: "Please try again",
      });
    }
  };

  // Function to scroll to a section when clicked from ProfileCompletion
  const scrollToSection = (sectionId: string) => {
    // Map profile completion sections to form sections
    const sectionMapping: Record<string, string> = {
      photos: "photos",
      bio: "bio",
      interests: "interests",
      basicInfo: "details",
      courseInfo: "details",
      socialLinks: "socials",
      lifestyle: "lifestyle",
      personality: "personality",
    };
    
    const formSection = sectionMapping[sectionId] || sectionId;
    setActiveSection(formSection);
    
    const section = document.getElementById(`section-${formSection}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-12">
      {/* Love-themed header with floating hearts animation */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[0, 20, 40, 60, 80, 100].map((leftPosition) => (
              <div
                key={leftPosition}
                className="absolute text-pink-500/20 dark:text-pink-500/10 text-4xl animate-float"
                style={{
                  left: `${leftPosition}%`,
                  animationDelay: `${leftPosition * 0.2}s`,
                }}
              >
                💝
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-8 md:grid-cols-2 md:gap-12"
        layout
      >
        {/* Photos Section */}
        <motion.div layoutId="photos-section" className="md:col-span-2" id="section-photos" ref={sectionRefs.photos}>
          <Card
            className={`relative overflow-hidden transition-all duration-300 ${
              activeSection === "photos"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("photos")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-pink-100/20 to-transparent dark:from-pink-950/20 pointer-events-none"
              animate={{
                opacity: activeSection === "photos" ? 1 : 0,
              }}
            />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <motion.div
                  animate={{
                    rotate: activeSection === "photos" ? 360 : 0,
                    scale: activeSection === "photos" ? 1.2 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Sparkles className="w-6 h-6 text-pink-500" />
                </motion.div>
                Your Best Pics 📸
              </CardTitle>
              <CardDescription className="text-base">
                Show off your main character energy! ✨
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={form.watch("photos")}
                onChange={handlePhotoUpdate}
                onRemove={handlePhotoRemove}
                onProfilePhotoSelect={handleProfilePhotoUpdate}
                maxFiles={6}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Bio & Interests Side by Side */}
        <motion.div layoutId="bio-section" id="section-bio" ref={sectionRefs.bio}>
          <Card
            className={`relative h-full overflow-hidden transition-all duration-300 ${
              activeSection === "bio"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("bio")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Your Story 💭
              </CardTitle>
              <CardDescription>Let your personality shine ✨</CardDescription>
            </CardHeader>
            <CardContent>
              <BioInput
                value={form.watch("bio")}
                onChange={(value) => handleFieldUpdate("bio", value)}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div layoutId="interests-section" id="section-interests" ref={sectionRefs.interests}>
          <Card
            className={`relative h-full overflow-hidden transition-all duration-300 ${
              activeSection === "interests"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("interests")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Your Vibes 🌟
              </CardTitle>
              <CardDescription>What makes you unique? ✨</CardDescription>
            </CardHeader>
            <CardContent>
              <InterestSelector
                value={form.watch("interests")}
                onChange={(value) => handleFieldUpdate("interests", value)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Details Section - Full Width */}
        <motion.div layoutId="details-section" className="md:col-span-2" id="section-details" ref={sectionRefs.basicInfo}>
          <Card
            className={`relative overflow-hidden transition-all duration-300 ${
              activeSection === "details"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("details")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Your Details 📝
              </CardTitle>
              <CardDescription>Tell us more about you ✨</CardDescription>
            </CardHeader>
            <CardContent>
              <DetailsInput
                control={form.control}
                values={{
                  firstName: form.watch("firstName"),
                  lastName: form.watch("lastName"),
                  lookingFor: form.watch("lookingFor"),
                  course: form.watch("course"),
                  yearOfStudy: form.watch("yearOfStudy"),
                  gender: form.watch("gender"),
                  age: form.watch("age"),
                  phoneNumber: form.watch("phoneNumber"),
                }}
                onChange={(field, value) => handleFieldUpdate(field, value)}
                errors={{
                  lookingFor: form.formState.errors.lookingFor?.message,
                  course: form.formState.errors.course?.message,
                  yearOfStudy: form.formState.errors.yearOfStudy?.message,
                  gender: form.formState.errors.gender?.message,
                  age: form.formState.errors.age?.message,
                  phoneNumber: form.formState.errors.phoneNumber?.message,
                  firstName: form.formState.errors.firstName?.message,
                  lastName: form.formState.errors.lastName?.message,
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Lifestyle Section - Full Width */}
        <motion.div layoutId="lifestyle-section" className="md:col-span-2" id="section-lifestyle" ref={sectionRefs.lifestyle}>
          <Card
            className={`relative overflow-hidden transition-all duration-300 ${
              activeSection === "lifestyle"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("lifestyle")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Lifestyle Details 🌿
              </CardTitle>
              <CardDescription>Tell us about your lifestyle preferences ✨</CardDescription>
            </CardHeader>
            <CardContent>
              <LifestyleInput
                values={{
                  drinkingPreference: form.watch("drinkingPreference"),
                  workoutFrequency: form.watch("workoutFrequency"),
                  socialMediaUsage: form.watch("socialMediaUsage"),
                  sleepingHabits: form.watch("sleepingHabits"),
                }}
                onChange={(field, value) => handleFieldUpdate(field, value)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Personality Section - Full Width */}
        <motion.div layoutId="personality-section" className="md:col-span-2" id="section-personality" ref={sectionRefs.personality}>
          <Card
            className={`relative overflow-hidden transition-all duration-300 ${
              activeSection === "personality"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("personality")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Personality & Communication 💫
              </CardTitle>
              <CardDescription>Share how you connect with others ✨</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalityInput
                values={{
                  personalityType: form.watch("personalityType") as "introvert" | "extrovert" | "ambivert" | undefined,
                  communicationStyle: form.watch("communicationStyle") as "direct" | "thoughtful" | "expressive" | "analytical" | undefined,
                  loveLanguage: form.watch("loveLanguage") as "words_of_affirmation" | "quality_time" | "acts_of_service" | "physical_touch" | "receiving_gifts" | undefined,
                  zodiacSign: form.watch("zodiacSign") as "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces" | undefined,
                }}
                onChange={(field, value) => handleFieldUpdate(field, value)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Socials Section - Full Width */}
        <motion.div layoutId="socials-section" className="md:col-span-2" id="section-socials" ref={sectionRefs.socialLinks}>
          <Card
            className={`relative overflow-hidden transition-all duration-300 ${
              activeSection === "socials"
                ? "ring-2 ring-pink-500 shadow-xl scale-[1.02] bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/50 dark:to-background"
                : "hover:shadow-lg hover:scale-[1.01] bg-white/50 dark:bg-background/50"
            }`}
            onMouseEnter={() => setActiveSection("socials")}
            onMouseLeave={() => setActiveSection(null)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Your Socials 📱
              </CardTitle>
              <CardDescription>
                Let&apos;s connect everywhere! (optional) ✨
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SocialInput
                values={{
                  instagram: form.watch("instagram"),
                  spotify: form.watch("spotify"),
                  snapchat: form.watch("snapchat"),
                }}
                onChange={(platform, value) =>
                  handleFieldUpdate(platform, value)
                }
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Love-themed footer decoration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex justify-center"
      >
        <Button
          disabled={!isChanged || isSubmitting}
          onClick={handleSubmit}
          className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full flex items-center gap-2"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin mr-2">💫</div>
              Saving...
            </>
          ) : (
            <>
              <span>Save Changes</span>
              <span>✨</span>
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
