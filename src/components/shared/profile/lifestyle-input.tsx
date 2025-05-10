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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="w-full"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="drinking" className="flex flex-col items-center gap-1">
            <Beer className="h-4 w-4" />
            <span className="text-xs">Drinking</span>
          </TabsTrigger>
          
          <TabsTrigger value="workout" className="flex flex-col items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            <span className="text-xs">Workout</span>
          </TabsTrigger>
          
          <TabsTrigger value="social" className="flex flex-col items-center gap-1">
            <AtSign className="h-4 w-4" />
            <span className="text-xs">Social Media</span>
          </TabsTrigger>
          
          <TabsTrigger value="sleep" className="flex flex-col items-center gap-1">
            <Moon className="h-4 w-4" />
            <span className="text-xs">Sleep</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Drinking preferences */}
        <TabsContent value="drinking" className="mt-0">
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    What's your drinking preference?
                  </Label>
                  
                  <RadioGroup
                    value={values.drinkingPreference}
                    onValueChange={(value) => onChange("drinkingPreference", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["not_for_me", "socially", "frequently", "prefer_not_to_say"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`drinking-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.drinkingPreference === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`drinking-${value}`} />
                            <span>{getReadableLabel(value)}</span>
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
                    className="bg-gradient-to-r from-pink-500 to-pink-600"
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
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    How often do you workout?
                  </Label>
                  
                  <RadioGroup
                    value={values.workoutFrequency}
                    onValueChange={(value) => onChange("workoutFrequency", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["never", "sometimes", "often", "active"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`workout-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.workoutFrequency === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`workout-${value}`} />
                            <span>{getReadableLabel(value)}</span>
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
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("social")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600"
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
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    How would you describe your social media usage?
                  </Label>
                  
                  <RadioGroup
                    value={values.socialMediaUsage}
                    onValueChange={(value) => onChange("socialMediaUsage", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["passive_scroller", "active_poster", "influencer", "minimal"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`social-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.socialMediaUsage === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`social-${value}`} />
                            <span>{getReadableLabel(value)}</span>
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
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("sleep")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600"
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
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    What are your sleeping habits?
                  </Label>
                  
                  <RadioGroup
                    value={values.sleepingHabits}
                    onValueChange={(value) => onChange("sleepingHabits", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["night_owl", "early_bird", "it_varies"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`sleep-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.sleepingHabits === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`sleep-${value}`} />
                            <span>{getReadableLabel(value)}</span>
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
                  >
                    Back
                  </Button>
                  
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-green-500 to-green-600"
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