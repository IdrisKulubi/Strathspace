"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Beer, Dumbbell, AtSign, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LifestyleAttributes {
  drinkingPreference?: "not_for_me" | "socially" | "frequently" | "prefer_not_to_say";
  workoutFrequency?: "never" | "sometimes" | "often" | "active";
  socialMediaUsage?: "passive_scroller" | "active_poster" | "influencer" | "minimal";
  sleepingHabits?: "night_owl" | "early_bird" | "it_varies";
}

interface LifestyleInputProps {
  values: LifestyleAttributes;
  onChange: (field: keyof LifestyleAttributes, value: string) => void;
}

// Helper function to get human-readable labels for enum values
const getReadableLabel = (value: string): string => {
  const labels: Record<string, string> = {
    // Drinking preferences
    not_for_me: "Not for me",
    socially: "Socially",
    frequently: "Frequently",
    prefer_not_to_say: "Prefer not to say",
    
    // Workout frequency
    never: "Never",
    sometimes: "Sometimes",
    often: "Often",
    active: "Active",
    
    // Social media usage
    passive_scroller: "Passive scroller",
    active_poster: "Active poster",
    influencer: "Influencer",
    minimal: "Minimal",
    
    // Sleeping habits
    night_owl: "Night owl",
    early_bird: "Early bird",
    it_varies: "It varies",
  };
  
  return labels[value] || value.replace(/_/g, " ");
};

export function LifestyleInput({ values, onChange }: LifestyleInputProps) {
  const [activeTab, setActiveTab] = useState("drinking");
  
  // Animation constants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (i: number) => ({ 
      opacity: 1, 
      scale: 1,
      transition: { 
        delay: i * 0.05,
        duration: 0.2,
      }
    }),
  };

  const tabsConfig = [
    { value: "drinking", icon: Beer, label: "Drinking" },
    { value: "workout", icon: Dumbbell, label: "Workout" },
    { value: "social", icon: AtSign, label: "Social Media" },
    { value: "sleep", icon: Moon, label: "Sleep" },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="w-full"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 gap-2 bg-transparent p-0">
          {tabsConfig.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg p-3 text-muted-foreground transition-all duration-200 ease-in-out",
                "hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-900/50 dark:hover:text-pink-400",
                activeTab === tab.value &&
                  "bg-pink-100 text-pink-700 shadow-md dark:bg-pink-950 dark:text-pink-300"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Drinking preferences */}
        <TabsContent value="drinking" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    What\'s your drinking preference?
                  </Label>
                  
                  <RadioGroup
                    value={values.drinkingPreference}
                    onValueChange={(value) => onChange("drinkingPreference", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["not_for_me", "socially", "frequently", "prefer_not_to_say"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`drinking-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.drinkingPreference === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`drinking-${value}`} 
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.drinkingPreference === value && "border-pink-600 dark:border-pink-500"
                              )}
                            />
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{getReadableLabel(value)}</span>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab("workout")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Next: Workout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Workout frequency */}
        <TabsContent value="workout" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    How often do you workout?
                  </Label>
                  
                  <RadioGroup
                    value={values.workoutFrequency}
                    onValueChange={(value) => onChange("workoutFrequency", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["never", "sometimes", "often", "active"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`workout-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.workoutFrequency === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`workout-${value}`}
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.workoutFrequency === value && "border-pink-600 dark:border-pink-500"
                              )}
                            />
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{getReadableLabel(value)}</span>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("drinking")}
                    className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("social")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Next: Social Media
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Social media usage */}
        <TabsContent value="social" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    How would you describe your social media usage?
                  </Label>
                  
                  <RadioGroup
                    value={values.socialMediaUsage}
                    onValueChange={(value) => onChange("socialMediaUsage", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["passive_scroller", "active_poster", "influencer", "minimal"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`social-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.socialMediaUsage === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`social-${value}`} 
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.socialMediaUsage === value && "border-pink-600 dark:border-pink-500"
                              )}
                            />
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{getReadableLabel(value)}</span>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("workout")}
                     className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("sleep")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Next: Sleep
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sleeping habits */}
        <TabsContent value="sleep" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    What are your sleeping habits?
                  </Label>
                  
                  <RadioGroup
                    value={values.sleepingHabits}
                    onValueChange={(value) => onChange("sleepingHabits", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["night_owl", "early_bird", "it_varies"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`sleep-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.sleepingHabits === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`sleep-${value}`} 
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.sleepingHabits === value && "border-pink-600 dark:border-pink-500"
                              )}
                            />
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{getReadableLabel(value)}</span>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("social")}
                    className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300"
                  >
                    Back
                  </Button>
                  
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                    disabled={!values.sleepingHabits}
                  >
                    All Done! ✓
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 