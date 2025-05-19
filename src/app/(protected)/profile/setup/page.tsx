"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {  submitProfile } from "@/lib/actions/profile.actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { InterestSelector } from "@/components/shared/profile/interest-selector";
import { useToast } from "@/hooks/use-toast";
import { profileSchema } from "@/lib/validators";
import { ImageUpload } from "@/components/shared/profile/image-upload";
import { steps } from "@/lib/constants";
import { BioInput } from "@/components/shared/profile/bio-input";
import { SocialInput } from "@/components/shared/profile/social-input";
import { DetailsInput } from "@/components/shared/profile/details-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { deleteUploadThingFile } from "@/lib/actions/upload.actions";
import { ProfileFormData } from "@/lib/constants";

import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { EyeOff, ShieldCheck } from "lucide-react";

function SetupForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAnonymous, setIsAnonymous] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.hasProfile) {
      router.replace("/explore");
    }
  }, [session, router]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      photos: [],
      interests: [],
      bio: "",
      firstName: "",
      lastName: "",
      lookingFor: undefined,
      course: "",
      yearOfStudy: 0,
      gender: undefined,
      age: 0,
      phoneNumber: "",
      instagram: "",
      spotify: "",
      snapchat: "",
      profilePhoto: "",
      drinkingPreference: undefined,
      workoutFrequency: undefined,
      socialMediaUsage: undefined,
      sleepingHabits: undefined,
      personalityType: "",
      communicationStyle: "",
      loveLanguage: "",
      zodiacSign: "",
      visibilityMode: "standard",
      incognitoMode: false,
      discoveryPaused: false,
      readReceiptsEnabled: true,
      showActiveStatus: true,
      anonymous: false,
      anonymousAvatar: "",
      anonymousRevealRequested: false,
      username: undefined,
    },
  });
  const handleDetailsInputChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (field: keyof Omit<ProfileFormData, "profilePhoto" | "photos" | "bio" | "interests" | "instagram" | "spotify" | "snapchat">, value: any) => {
      form.setValue(field as keyof ProfileFormData, value, { shouldValidate: true, shouldDirty: true });
    },
    [form]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const data = form.getValues();

      // Set profile photo to first photo if not set
      if (!data.profilePhoto && data.photos.length > 0) {
        data.profilePhoto = data.photos[0];
      }

      const result = await submitProfile(data);

      if (result.success) {
        toast({
          title: "Success!",
          description: "Profile created successfully",
        });
        router.push("/explore");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            result.error ||
            "Something went wrong",

        });
      }
    } catch (error) {
      console.error("Error submitting profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create profile. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    const currentStepData = form.getValues();

    switch (step) {
      case 0: // Photos
        if (currentStepData.photos.length === 0) {
          toast({
            variant: "destructive",
            title: "Upload Required",
            description: "Please upload at least one photo to continue",
          });
          return;
        }
        break;

      case 1: // Bio
        if (currentStepData.bio.split(/\s+/).filter(Boolean).length < 10) {
          toast({
            variant: "destructive",
            title: "Bio Too Short",
            description: `Please write at least 10 words (currently ${
              currentStepData.bio.split(/\s+/).filter(Boolean).length
            } words)`,
          });
          return;
        }
        break;

      case 2: // Interests
        if (currentStepData.interests.length < 3) {
          toast({
            variant: "destructive",
            title: "More Interests Needed",
            description: `Please select at least 3 interests (currently ${currentStepData.interests.length} selected)`,
          });
          return;
        }
        break;

      case 3: // Details
        const missingFields = [];
        if (!currentStepData.firstName?.trim())
          missingFields.push("First Name");
        if (!currentStepData.lastName?.trim()) missingFields.push("Last Name");
        if (!currentStepData.course?.trim()) missingFields.push("Course");
        if (!currentStepData.yearOfStudy) missingFields.push("Year of Study");
        if (!currentStepData.gender) missingFields.push("Gender");
        if (!currentStepData.age) missingFields.push("Age");
        if (!currentStepData.lookingFor) missingFields.push("Looking For");

        // Special validation for phone number
        const phoneDigits = currentStepData.phoneNumber?.replace(/[^0-9]/g, "");
        if (!currentStepData.phoneNumber?.trim()) {
          missingFields.push("Phone Number");
        } else if (!/^\+?[1-9]\d{1,14}$/.test(currentStepData.phoneNumber)) {
          toast({
            variant: "destructive",
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number",
          });
          return;
        } else if (phoneDigits?.length < 10 || phoneDigits?.length > 15) {
          toast({
            variant: "destructive",
            title: "Invalid Phone Number",
            description: "Phone number must be between 10 and 15 digits",
          });
          return;
        }

        if (missingFields.length > 0) {
          toast({
            variant: "destructive",
            title: "Required Fields Missing",
            description: `Please fill in: ${missingFields.join(", ")}`,
          });
          return;
        }
        break;
    }

    setStep(step + 1);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canProceed = (step: number, formData: ProfileFormData) => {
    switch (step) {
      case 0: // Photos
        return formData.photos.length > 0;
      case 1: // Bio
        return formData.bio?.split(" ").length >= 10;
      case 2: // Interests
        return formData.interests.length >= 3;
      case 3: // Details
        return (
          formData.firstName &&
          formData.lastName &&
          formData.lookingFor &&
          formData.course &&
          formData.yearOfStudy &&
          formData.phoneNumber &&
          formData.phoneNumber.trim() !== "" &&
          /^[0-9+\-\s()]+$/.test(formData.phoneNumber) &&
          formData.phoneNumber.replace(/[^0-9]/g, "").length === 10
        );
      case 4: // Social (optional)
        return true;
      default:
        return true;
    }
  };
  /* eslint-disable  @typescript-eslint/no-unused-vars */

  const isFormValid = (formData: ProfileFormData) => {
    const digitsOnly = formData.phoneNumber?.replace(/[^0-9]/g, "") || "";


    return (
      formData.photos.length > 0 &&
      formData.bio?.split(/\s+/).filter(Boolean).length >= 10 &&
      formData.interests.length >= 3 &&
      formData.lookingFor &&
      formData.course?.trim() !== "" &&
      formData.yearOfStudy > 0 &&
      formData.gender &&
      formData.age >= 18 &&
      formData.age <= 25 &&
      formData.firstName?.trim().length >= 2 &&
      formData.lastName?.trim().length >= 2 &&
      // Phone number validation
      formData.phoneNumber &&
      formData.phoneNumber.trim() !== "" &&
      /^[0-9+\-\s()]+$/.test(formData.phoneNumber) &&
      digitsOnly.length === 10
    );
  };

  useEffect(() => {
    return () => {
      const photos = form.getValues("photos");
      if (photos.length > 0) {
        photos.forEach(async (url: string) => {
          await deleteUploadThingFile(url);
        });
      }
    };
  }, [form]);

 

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/30 to-white dark:from-pink-950/30 dark:to-background">
      <div className="container max-w-2xl py-16">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Anonymous Mode Card */}
          <Card className="border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                  <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    New Feature: Anonymous Mode
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                      NEW
                    </span>
                  </h3>
                  <p className="mt-2 text-sm text-purple-700 dark:text-purple-400">
                    Want to keep your identity private? You can enable Anonymous Mode anytime from your profile settings after creating your profile. Your photos will be hidden and you&apos;ll only match with other anonymous users when Anonymous Mode is on.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-gradient bg-gradient-to-r from-pink-500 to-pink-700 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent">
                {steps[step].title}
              </h2>
              <div className="text-sm text-muted-foreground">
                Step {step + 1} of {steps.length}
              </div>
            </div>
            
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-600"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <ImageUpload
                    value={form.watch("photos")}
                    onChange={(photos) => form.setValue("photos", photos)}
                    onRemove={async (url) => {
                      const photos = form.watch("photos").filter((p) => p !== url);
                      form.setValue("photos", photos);
                      await deleteUploadThingFile(url);
                    }}
                    onProfilePhotoSelect={(url) => form.setValue("profilePhoto", url)}
                    maxFiles={6}
                  />
                  {isAnonymous && (
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/50">
                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <EyeOff className="w-4 h-4" />
                        <p className="text-sm">
                          Your photos will be hidden in Anonymous Mode. You can still upload them now and they&apos;ll be revealed when you disable Anonymous Mode.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <BioInput
                  value={form.watch("bio") || ""}
                  onChange={(value) => form.setValue("bio", value)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <InterestSelector
                  value={form.watch("interests")}
                  onChange={(interests) => form.setValue("interests", interests)}
                />
                {form.formState.errors.interests && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.interests.message}
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <DetailsInput
                  control={form.control}
                  values={{
                    firstName: form.watch("firstName") || "",
                    lastName: form.watch("lastName") || "",
                    lookingFor: form.watch("lookingFor") || "",
                    course: form.watch("course") || "",
                    yearOfStudy: form.watch("yearOfStudy") || 0,
                    gender: form.watch("gender") || "",
                    age: form.watch("age") || 0,
                    phoneNumber: form.watch("phoneNumber") || "",
                  }}
                  onChange={handleDetailsInputChange}
                  errors={{
                    firstName: form.formState.errors.firstName?.message,
                    lastName: form.formState.errors.lastName?.message,
                    lookingFor: form.formState.errors.lookingFor?.message,
                    course: form.formState.errors.course?.message,
                    yearOfStudy: form.formState.errors.yearOfStudy?.message,
                    gender: form.formState.errors.gender?.message,
                    age: form.formState.errors.age?.message,
                    
                    phoneNumber: form.formState.errors.phoneNumber?.message,
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        {...form.register("firstName")}
                        placeholder="Your first name"
                        className="bg-background"
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-red-500 text-sm">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        {...form.register("lastName")}
                        placeholder="Your last name"
                        className="bg-background"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-red-500 text-sm">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                </DetailsInput>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <SocialInput
                  values={{
                    instagram: form.watch("instagram"),
                    spotify: form.watch("spotify"),
                    snapchat: form.watch("snapchat"),
                  }}
                  onChange={(platform, value) => form.setValue(platform, value)}
                />
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} className="ml-auto">
                Next
              </Button>
            ) : (
              <motion.div
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                <Button
                  type="submit"
                  className="ml-auto relative"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Creating Profile...
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      Create Profile
                    </motion.span>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default SetupForm;   
