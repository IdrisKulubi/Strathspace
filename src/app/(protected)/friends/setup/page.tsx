"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { InterestSelector } from "@/components/shared/profile/interest-selector";
import { useToast } from "@/hooks/use-toast";
import { friendsProfileSchema, type FriendsProfileFormData } from "@/lib/validators/friends-profile";
import { ImageUpload } from "@/components/shared/profile/image-upload";
import { BioInput } from "@/components/shared/profile/bio-input";
import { SocialInput } from "@/components/shared/profile/social-input";
import { DetailsInput } from "@/components/shared/profile/details-input";
import { StudyPreferencesInput } from "@/components/friends/study-preferences-input";
import { useSession } from "next-auth/react";
import { submitProfile } from "@/lib/actions/profile.actions";
import { updateProfileCompletion } from "@/lib/actions/profile-modes";

const steps = [
  {
    id: "photos",
    title: "Add Your Photos (Optional)",
    description: "Upload photos to make your profile more engaging",
  },
  {
    id: "bio",
    title: "Write Your Bio",
    description: "Tell others about yourself and what you're looking for",
  },
  {
    id: "interests",
    title: "Select Your Interests",
    description: "Choose interests to match with like-minded people",
  },
  {
    id: "details",
    title: "Basic Details",
    description: "Fill in your basic information",
  },
  {
    id: "study",
    title: "Study Preferences",
    description: "Tell us about your study habits and goals",
  },
  {
    id: "social",
    title: "Social Media (Optional)",
    description: "Add your social media handles",
  },
];

export default function FriendsSetupForm() {
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

  const form = useForm<FriendsProfileFormData>({
    resolver: zodResolver(friendsProfileSchema),
    defaultValues: {
      photos: [],
      interests: [],
      bio: "",
      studyPreferences: {
        preferredStudyTime: "",
        studyStyle: "",
        subjectInterests: [],
        groupSize: "",
        academicGoals: [],
      },
      studyAvailability: [],
      projectInterests: [],
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const data = form.getValues();

      // Set profile photo to first photo if not set and photos exist
      if (!data.profilePhoto && data.photos && data.photos.length > 0) {
        data.profilePhoto = data.photos[0];
      }

      const result = await submitProfile(data);

      if (result.success) {
        // Update profile completion status for friends mode
        await updateProfileCompletion("friends", true);
        
        toast({
          title: "Success!",
          description: "Friends profile created successfully",
        });
        router.push("/explore");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Something went wrong",
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
        if (!currentStepData.firstName?.trim()) missingFields.push("First Name");
        if (!currentStepData.lastName?.trim()) missingFields.push("Last Name");
        if (!currentStepData.course?.trim()) missingFields.push("Course");
        if (!currentStepData.yearOfStudy) missingFields.push("Year of Study");
        if (!currentStepData.gender) missingFields.push("Gender");
        if (!currentStepData.age) missingFields.push("Age");

        if (missingFields.length > 0) {
          toast({
            variant: "destructive",
            title: "Required Fields Missing",
            description: `Please fill in: ${missingFields.join(", ")}`,
          });
          return;
        }
        break;

      case 4: // Study Preferences
        const { studyPreferences } = currentStepData;
        if (!studyPreferences?.preferredStudyTime) {
          toast({
            variant: "destructive",
            title: "Study Time Required",
            description: "Please select your preferred study time",
          });
          return;
        }
        if (!studyPreferences?.studyStyle) {
          toast({
            variant: "destructive",
            title: "Study Style Required",
            description: "Please select your study style",
          });
          return;
        }
        if (!studyPreferences?.subjectInterests?.length) {
          toast({
            variant: "destructive",
            title: "Subject Interests Required",
            description: "Please select at least one subject interest",
          });
          return;
        }
        if (!studyPreferences?.groupSize) {
          toast({
            variant: "destructive",
            title: "Group Size Required",
            description: "Please select your preferred group size",
          });
          return;
        }
        if (!studyPreferences?.academicGoals?.length) {
          toast({
            variant: "destructive",
            title: "Academic Goals Required",
            description: "Please select at least one academic goal",
          });
          return;
        }
        break;
    }

    setStep(step + 1);
  };

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
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <DetailsInput
                control={form.control}
                values={{
                  firstName: form.watch("firstName") || "",
                  lastName: form.watch("lastName") || "",
                  course: form.watch("course") || "",
                  yearOfStudy: form.watch("yearOfStudy") || 0,
                  gender: form.watch("gender") || "",
                  age: form.watch("age") || 0,
                }}
                onChange={(field, value) => form.setValue(field, value)}
                errors={{
                  firstName: form.formState.errors.firstName?.message,
                  lastName: form.formState.errors.lastName?.message,
                  course: form.formState.errors.course?.message,
                  yearOfStudy: form.formState.errors.yearOfStudy?.message,
                  gender: form.formState.errors.gender?.message,
                  age: form.formState.errors.age?.message,
                }}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <StudyPreferencesInput
                values={form.watch("studyPreferences")}
                onChange={(field, value) =>
                  form.setValue(`studyPreferences.${field}`, value)
                }
                errors={{
                  preferredStudyTime:
                    form.formState.errors.studyPreferences?.preferredStudyTime
                      ?.message,
                  studyStyle:
                    form.formState.errors.studyPreferences?.studyStyle?.message,
                  subjectInterests:
                    form.formState.errors.studyPreferences?.subjectInterests
                      ?.message,
                  groupSize:
                    form.formState.errors.studyPreferences?.groupSize?.message,
                  academicGoals:
                    form.formState.errors.studyPreferences?.academicGoals?.message,
                }}
              />
            </div>
          )}

          {step === 5 && (
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

          <div className="flex justify-between pt-8">
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
              <Button
                type="button"
                onClick={handleNext}
                className="ml-auto bg-pink-500 hover:bg-pink-600"
              >
                Next
              </Button>
            ) : (
              <motion.div
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                <Button
                  type="submit"
                  className="ml-auto bg-pink-500 hover:bg-pink-600"
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