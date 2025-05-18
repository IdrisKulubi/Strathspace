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

function SetupForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-pink-950 dark:to-background p-6 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {steps[step].title}
          </h1>
          <p className="text-muted-foreground">{steps[step].description}</p>
        </div>

        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.id}
              className={`h-2 flex-1 rounded-full ${
                i <= step ? "bg-pink-500" : "bg-pink-100 dark:bg-pink-900"
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {step === 0 && (
            <div className="space-y-4">
              <ImageUpload
                value={form.watch("photos")}
                onChange={(urls) => form.setValue("photos", urls)}
                maxFiles={6}
              />
              {form.formState.errors.photos && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.photos.message}
                </p>
              )}
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

          <div className="flex justify-between">
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
      </motion.div>
    </div>
  );
}

export default SetupForm;   
