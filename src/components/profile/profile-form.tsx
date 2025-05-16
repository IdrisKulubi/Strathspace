"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/validators";
import { useToast } from "@/hooks/use-toast";
import { BioInput } from "@/components/shared/profile/bio-input";
import { InterestSelector } from "@/components/shared/profile/interest-selector";
import { SocialInput } from "@/components/shared/profile/social-input";
import { LifestyleInput } from "@/components/shared/profile/lifestyle-input";
import { PersonalityInput } from "@/components/shared/profile/personality-input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, UserRound, Heart, Coffee, Stars, Smartphone, Loader2, InfoIcon, Save } from "lucide-react";
import {
  updateProfilePhoto,
  removePhoto,
  updateProfile,
} from "@/lib/actions/profile.actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "../shared/profile/image-upload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { Calendar } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "../ui/input";
import { ProfileFormData } from "@/lib/constants";

interface ProfileFormProps {
  initialData: ProfileFormData;
  activeTab?: string | null;
  onFormValuesChange?: (values: ProfileFormData) => void;
}

export function ProfileForm({ initialData, activeTab, onFormValuesChange }: ProfileFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [_activeSection, setActiveSection] = useState<string | null>(activeTab || null);
  const [isChanged, setIsChanged] = useState(false);
  const [_isSubmitting, _setIsSubmitting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formStatus, _setFormStatus] = useState<{ status: string; message: string } | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  const tooltipStyles = "bg-white/95 dark:bg-slate-800 border-2 border-pink-300 dark:border-pink-700 p-2.5 text-sm font-medium text-pink-900 dark:text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] dark:shadow-[0_0_15px_rgba(236,72,153,0.4)] rounded-lg backdrop-blur-sm";
  
  const sectionRefs = {
    photos: useRef<HTMLDivElement>(null),
    bio: useRef<HTMLDivElement>(null),
    interests: useRef<HTMLDivElement>(null),
    basicInfo: useRef<HTMLDivElement>(null),
    courseInfo: useRef<HTMLDivElement>(null), 
    socialLinks: useRef<HTMLDivElement>(null),
    lifestyle: useRef<HTMLDivElement>(null),
    personality: useRef<HTMLDivElement>(null),
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  useEffect(() => {
    const initialValues = JSON.stringify(initialData);
    
    const subscription = form.watch(() => {
      const currentValues = JSON.stringify(form.getValues());
      const hasChanges = initialValues !== currentValues;
      
      if (hasChanges !== isChanged) {
        setIsChanged(hasChanges);
      }
      
      if (onFormValuesChange) {
        onFormValuesChange(form.getValues());
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, initialData, isChanged, onFormValuesChange]);
  
  useEffect(() => {
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
      
      setTimeout(() => {
        const section = document.getElementById(`section-${sectionMapping[activeTab]}`);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [activeTab]);


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

  const onSubmit = async (data: ProfileFormData) => {
    setIsPending(true);
    try {
      const result = await updateProfile(data);
      if (result.success) {
        // Reset form state to avoid considering current values as changes
        form.reset(data);
        setIsChanged(false);
        router.refresh();
        // Show success animation
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
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
      setIsPending(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
      {formStatus?.message && (
        <div
          className={cn(
            "p-3 rounded-md text-sm",
            formStatus.status === "error"
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          )}
        >
          {formStatus.message}
        </div>
      )}
      
      {/* Status Indicator - Shows when changes are pending */}
      <AnimatePresence>
        {isChanged && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-2 z-50 w-full"
          >
            <div className="mx-auto max-w-md bg-pink-50 dark:bg-pink-950/70 border border-pink-200 dark:border-pink-800 rounded-full py-2 px-4 flex items-center justify-center gap-2 shadow-md">
              <div className="h-2 w-2 rounded-full bg-pink-500 animate-pulse"></div>
              <p className="text-sm font-medium text-pink-700 dark:text-pink-300">
                You have unsaved changes
              </p>
            </div>
          </motion.div>
        )}
        
        {showSaveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-2 z-50 w-full"
          >
            <div className="mx-auto max-w-md bg-green-50 dark:bg-green-950/70 border border-green-200 dark:border-green-800 rounded-full py-2 px-4 flex items-center justify-center gap-2 shadow-md">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Changes saved successfully! ✓
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Navigation Tabs for Profile Sections */}
      <TooltipProvider delayDuration={300}>
        <Tabs defaultValue={activeTab || "details"} className="w-full">
          <TabsList className="grid grid-cols-5 sm:grid-cols-5 w-full mb-6 p-1.5 bg-pink-50/50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900 rounded-xl relative overflow-hidden">
            {/* Visual separators between tabs */}
            <div className="absolute top-3 bottom-3 left-1/5 w-px bg-pink-200 dark:bg-pink-800/50"></div>
            <div className="absolute top-3 bottom-3 left-2/5 w-px bg-pink-200 dark:bg-pink-800/50"></div>
            <div className="absolute top-3 bottom-3 left-3/5 w-px bg-pink-200 dark:bg-pink-800/50"></div>
            <div className="absolute top-3 bottom-3 left-4/5 w-px bg-pink-200 dark:bg-pink-800/50"></div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value="photos" 
                  className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                    data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                    rounded-lg py-2.5 relative overflow-hidden transition-all duration-300 
                    hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                    after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2
                    after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                >
                  <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Photos</span>
                  <span className="sm:hidden">Photos</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                Manage your profile photos
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value="details" 
                  className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                    data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                    rounded-lg py-2.5 relative overflow-hidden transition-all duration-300 
                    hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                    after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2
                    after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                >
                  <UserRound className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Basic Info</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                Your personal information and bio
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value="preferences" 
                  className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                    data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                    rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                    hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                    after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2
                    after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                >
                  <Heart className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Preferences</span>
                  <span className="sm:hidden">Prefs</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                Dating preferences and interests
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value="lifestyle" 
                  className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                    data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                    rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                    hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                    after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2
                    after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                >
                  <Coffee className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Lifestyle</span>
                  <span className="sm:hidden">Life</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                Your habits and lifestyle details
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value="personality" 
                  className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 
                    data-[state=active]:shadow-md data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 
                    rounded-lg py-2.5 relative overflow-hidden transition-all duration-300
                    hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-sm
                    after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2
                    after:w-0 data-[state=active]:after:w-4/5 after:h-0.5 after:bg-pink-500 after:transition-all after:duration-300"
                >
                  <Stars className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Personality</span>
                  <span className="sm:hidden">Person</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className={tooltipStyles}>
                Your personality traits and communication style
              </TooltipContent>
            </Tooltip>
          </TabsList>

          {/* Photos Tab Content */}
          <TabsContent value="photos" className="mt-4 space-y-4 animate-in fade-in-50">
            <Card id="section-photos" ref={sectionRefs.photos} className="relative overflow-hidden transition-all duration-300 shadow-md border-pink-100 dark:border-pink-900 hover:shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-pink-600"></div>
              <CardHeader className="bg-gradient-to-r from-pink-50/50 to-white dark:from-pink-950/50 dark:to-slate-950">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-500" />
                  Profile Photos
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-pink-400 cursor-help ml-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className={tooltipStyles}>
                      <p>Upload photos to make your profile stand out! You can set one as your main profile photo.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Show your best self in up to 6 photos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6 bg-white dark:bg-slate-950">
                <div className="space-y-6">
                  <ImageUpload
                    value={form.watch("photos")}
                    onChange={handlePhotoUpdate}
                    onRemove={handlePhotoRemove}
                    onProfilePhotoSelect={handleProfilePhotoUpdate}
                    maxFiles={6}
                  />
                  {form.formState.errors.photos?.message && (
                    <p className="text-sm text-red-500">{form.formState.errors.photos.message}</p>
                  )}
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                    <p className="flex items-center gap-2">
                      <InfoIcon className="w-4 h-4 text-blue-500" />
                      <span>Click on the user icon on any photo to set it as your main profile image.</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab Content */}
          <TabsContent value="details" className="mt-4 space-y-4 animate-in fade-in-50">
            <Card className="relative overflow-hidden transition-all duration-300 shadow-md border-pink-100 dark:border-pink-900 hover:shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-pink-600"></div>
              <CardHeader className="bg-gradient-to-r from-pink-50/50 to-white dark:from-pink-950/50 dark:to-slate-950">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <UserRound className="w-5 h-5 text-pink-500" />
                  Basic Information
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-pink-400 cursor-help ml-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className={tooltipStyles}>
                      <p>Tell us about yourself so potential matches can get to know you better!</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Share your story and what makes you unique</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6 bg-white dark:bg-slate-950">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <BioInput
                      value={form.watch("bio")}
                      onChange={(value) => handleFieldUpdate("bio", value)}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-pink-500" />
                          First Name
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="w-3.5 h-3.5 text-pink-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className={tooltipStyles}>
                              This will be visible to other users
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          value={form.watch("firstName")}
                          onChange={(e) => handleFieldUpdate("firstName", e.target.value)}
                          placeholder="Your first name"
                          className="bg-pink-50/50 dark:bg-pink-950/50 border-pink-200 focus:border-pink-400 focus:ring-pink-400 dark:focus:border-pink-700 dark:focus:ring-pink-700 transition-all"
                        />
                        {form.formState.errors.firstName?.message && (
                          <p className="text-sm text-red-500">{form.formState.errors.firstName?.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-pink-500" />
                          Last Name
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="w-3.5 h-3.5 text-pink-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className={tooltipStyles}>
                              This will be visible to other users
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          value={form.watch("lastName")}
                          onChange={(e) => handleFieldUpdate("lastName", e.target.value)}
                          placeholder="Your last name"
                          className="bg-pink-50/50 dark:bg-pink-950/50 border-pink-200 focus:border-pink-400 focus:ring-pink-400 dark:focus:border-pink-700 dark:focus:ring-pink-700 transition-all"
                        />
                        {form.formState.errors.lastName?.message && (
                          <p className="text-sm text-red-500">{form.formState.errors.lastName?.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-pink-500" />
                        What&apos;s your course? 📚
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoIcon className="w-3.5 h-3.5 text-pink-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className={tooltipStyles}>
                            Let others know what you&apos;re studying
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        value={form.watch("course")}
                        onChange={(e) => handleFieldUpdate("course", e.target.value)}
                        placeholder="e.g., Computer Science"
                        className="bg-pink-50/50 dark:bg-pink-950/50 border-pink-200 focus:border-pink-400 focus:ring-pink-400 dark:focus:border-pink-700 dark:focus:ring-pink-700 transition-all"
                      />
                      {form.formState.errors.course?.message && (
                        <p className="text-sm text-red-500">{form.formState.errors.course.message}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-pink-500" />
                          Year of Study 🎓
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="w-3.5 h-3.5 text-pink-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className={tooltipStyles}>
                              What year of university are you in?
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select
                          value={(form.watch("yearOfStudy") ?? "").toString()}
                          onValueChange={(value) => handleFieldUpdate("yearOfStudy", parseInt(value))}
                        >
                          <SelectTrigger className="bg-pink-50/50 dark:bg-pink-950/50 border-pink-200 focus:border-pink-400 focus:ring-pink-400 dark:focus:border-pink-700 dark:focus:ring-pink-700 transition-all">
                            <SelectValue placeholder="Select your year" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                Year {year} {year === 1 ? "👶" : year === 5 ? "👑" : "✨"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.yearOfStudy?.message && (
                          <p className="text-sm text-red-500">{form.formState.errors.yearOfStudy.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-pink-500" />
                          How old are you? 🎂
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="w-3.5 h-3.5 text-pink-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className={tooltipStyles}>
                              All users must be at least 18 years old
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select
                          value={form.watch("age")?.toString() || ""}
                          onValueChange={(value) => handleFieldUpdate("age", parseInt(value))}
                        >
                          <SelectTrigger className="bg-pink-50/50 dark:bg-pink-950/50 border-pink-200 focus:border-pink-400 focus:ring-pink-400 dark:focus:border-pink-700 dark:focus:ring-pink-700 transition-all">
                            <SelectValue placeholder="Select your age" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 8 }, (_, i) => i + 18).map((age) => (
                              <SelectItem key={age} value={age.toString()}>
                                {age} {age === 18 ? "🌱" : age === 25 ? "✨" : "🎈"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.age?.message && (
                          <p className="text-sm text-red-500">{form.formState.errors.age.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        What&apos;s your gender? 💫
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoIcon className="w-3.5 h-3.5 text-pink-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className={tooltipStyles}>
                            This helps us match you with compatible people
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={form.watch("gender")}
                        onValueChange={(value) => handleFieldUpdate("gender", value)}
                      >
                        <SelectTrigger className="bg-pink-50/50 dark:bg-pink-950/50 border-pink-200 focus:border-pink-400 focus:ring-pink-400 dark:focus:border-pink-700 dark:focus:ring-pink-700 transition-all">
                          <SelectValue placeholder="Choose your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male ♂️</SelectItem>
                          <SelectItem value="female">Female ♀️</SelectItem>
                          <SelectItem value="non-binary">Non-binary ⚧️</SelectItem>
                          <SelectItem value="other">Other 💫</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.gender?.message && (
                        <p className="text-sm text-red-500">{form.formState.errors.gender.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab Content */}
          <TabsContent value="preferences" className="mt-4 space-y-4 animate-in fade-in-50">
            <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Dating Preferences
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    What are you looking for? 💖
                  </Label>
                  <RadioGroup 
                    value={form.watch("lookingFor")}
                    onValueChange={(value) => handleFieldUpdate("lookingFor", value)}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <div className="w-full">
                      <Label
                        htmlFor="lookingFor-friends"
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                          "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                          "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                          form.watch("lookingFor") === "friends" && "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="friends" id="lookingFor-friends" />
                          <span>Friends 🤝</span>
                        </div>
                      </Label>
                    </div>
                    <div className="w-full">
                      <Label
                        htmlFor="lookingFor-dating"
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                          "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                          "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                          form.watch("lookingFor") === "dating" && "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="dating" id="lookingFor-dating" />
                          <span>Dating 💘</span>
                        </div>
                      </Label>
                    </div>
                    <div className="w-full">
                      <Label
                        htmlFor="lookingFor-both"
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                          "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                          "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                          form.watch("lookingFor") === "both" && "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="both" id="lookingFor-both" />
                          <span>Both 🌟</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {form.formState.errors.lookingFor?.message && (
                    <p className="text-sm text-red-500">{form.formState.errors.lookingFor.message}</p>
                  )}
                </div>
              
                <InterestSelector
                  value={form.watch("interests")}
                  onChange={(value) => handleFieldUpdate("interests", value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Lifestyle Tab Content */}
          <TabsContent value="lifestyle" className="mt-4 space-y-4 animate-in fade-in-50">
            <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-pink-500" />
                Lifestyle
              </h3>
              <LifestyleInput
                  values={{
                  drinkingPreference: form.watch("drinkingPreference"),
                  workoutFrequency: form.watch("workoutFrequency"),
                  socialMediaUsage: form.watch("socialMediaUsage"),
                  sleepingHabits: form.watch("sleepingHabits"),
                  }}
                  onChange={(field, value) => handleFieldUpdate(field, value)}
              />
            </div>
            
            <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-pink-500" />
                Social Links
              </h3>
                <SocialInput
                  values={{
                    instagram: form.watch("instagram"),
                    spotify: form.watch("spotify"),
                    snapchat: form.watch("snapchat"),
                  }}
                onChange={(platform, value) => handleFieldUpdate(platform, value)}
              />
            </div>
          </TabsContent>

          {/* Personality Tab Content */}
          <TabsContent value="personality" className="mt-4 space-y-4 animate-in fade-in-50">
            <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Stars className="w-5 h-5 text-pink-500" />
                Personality
              </h3>
              <PersonalityInput
                values={{
                  personalityType: form.watch("personalityType") as "introvert" | "extrovert" | "ambivert" | undefined,
                  communicationStyle: form.watch("communicationStyle") as "direct" | "thoughtful" | "expressive" | "analytical" | undefined,
                  loveLanguage: form.watch("loveLanguage") as "words_of_affirmation" | "quality_time" | "acts_of_service" | "physical_touch" | "receiving_gifts" | undefined,
                  zodiacSign: form.watch("zodiacSign") as "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces" | undefined,
                }}
                onChange={(field, value) => handleFieldUpdate(field, value)}
              />
          </div>
          </TabsContent>
        </Tabs>
      </TooltipProvider>

      {/* Save Button - Fixed at Bottom for Mobile */}
      <div className="sticky bottom-4 pt-4 bg-gradient-to-t from-white dark:from-background">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                type="submit"
                disabled={!isChanged || isPending}
                className={cn(
                  "w-full py-6 text-lg font-medium border-none transition-all duration-300 relative overflow-hidden group",
                  isChanged 
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-lg hover:shadow-xl" 
                    : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "absolute inset-0 w-full h-full transition-all duration-300",
                  isChanged ? "bg-gradient-to-r from-pink-400/0 via-white/20 to-pink-400/0 -translate-x-full group-hover:translate-x-full" : ""
                )}></span>
                <span className="relative flex items-center justify-center gap-2">
                  {isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save Profile
                      {isChanged && <Badge variant="outline" className="ml-2 bg-white/20 border-white/40 text-white text-xs py-0">Changes Pending</Badge>}
                    </>
                  )}
                </span>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className={tooltipStyles}>
            {!isChanged ? "Make changes to enable saving" : "Save your profile changes"}
          </TooltipContent>
        </Tooltip>
      </div>
    </form>
  );
}
