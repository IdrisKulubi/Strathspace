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
import { Brain, Heart, MessageCircle, Stars } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PersonalityAttributes {
  personalityType?: "introvert" | "extrovert" | "ambivert"; 
  communicationStyle?: "direct" | "thoughtful" | "expressive" | "analytical";
  loveLanguage?: "words_of_affirmation" | "quality_time" | "acts_of_service" | "physical_touch" | "receiving_gifts";
  zodiacSign?: "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";
}

interface PersonalityInputProps {
  values: PersonalityAttributes;
  onChange: (field: keyof PersonalityAttributes, value: string) => void;
}

// Helper function to get human-readable labels
const getReadableLabel = (value: string): string => {
  const labels: Record<string, string> = {
    // Personality types
    introvert: "Introvert",
    extrovert: "Extrovert",
    ambivert: "Ambivert",
    
    // Communication styles
    direct: "Direct",
    thoughtful: "Thoughtful",
    expressive: "Expressive",
    analytical: "Analytical",
    
    // Love languages
    words_of_affirmation: "Words of Affirmation",
    quality_time: "Quality Time",
    acts_of_service: "Acts of Service",
    physical_touch: "Physical Touch",
    receiving_gifts: "Receiving Gifts",
    
    // Zodiac signs
    aries: "Aries",
    taurus: "Taurus",
    gemini: "Gemini",
    cancer: "Cancer",
    leo: "Leo",
    virgo: "Virgo",
    libra: "Libra",
    scorpio: "Scorpio",
    sagittarius: "Sagittarius",
    capricorn: "Capricorn",
    aquarius: "Aquarius",
    pisces: "Pisces",
  };
  
  return labels[value] || value.replace(/_/g, " ");
};

export function PersonalityInput({ values, onChange }: PersonalityInputProps) {
  const [activeTab, setActiveTab] = useState("personality");
  
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
    { value: "personality", icon: Brain, label: "Personality" },
    { value: "communication", icon: MessageCircle, label: "Communication" },
    { value: "love", icon: Heart, label: "Love Language" },
    { value: "zodiac", icon: Stars, label: "Zodiac" },
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
        
        {/* Personality type */}
        <TabsContent value="personality" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    What's your personality type?
                  </Label>
                  
                  <RadioGroup
                    value={values.personalityType}
                    onValueChange={(value) => onChange("personalityType", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["introvert", "extrovert", "ambivert"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`personality-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.personalityType === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`personality-${value}`}
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.personalityType === value && "border-pink-600 dark:border-pink-500"
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
                    onClick={() => setActiveTab("communication")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Next: Communication
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Communication style */}
        <TabsContent value="communication" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    How would you describe your communication style?
                  </Label>
                  
                  <RadioGroup
                    value={values.communicationStyle}
                    onValueChange={(value) => onChange("communicationStyle", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["direct", "thoughtful", "expressive", "analytical"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`communication-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.communicationStyle === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`communication-${value}`}
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.communicationStyle === value && "border-pink-600 dark:border-pink-500"
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
                    onClick={() => setActiveTab("personality")}
                    className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("love")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Next: Love Language
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Love language */}
        <TabsContent value="love" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    What's your primary love language?
                  </Label>
                  
                  <RadioGroup
                    value={values.loveLanguage}
                    onValueChange={(value) => onChange("loveLanguage", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["words_of_affirmation", "quality_time", "acts_of_service", "physical_touch", "receiving_gifts"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`love-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.loveLanguage === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`love-${value}`} 
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.loveLanguage === value && "border-pink-600 dark:border-pink-500"
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
                    onClick={() => setActiveTab("communication")}
                    className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("zodiac")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Next: Zodiac
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Zodiac sign */}
        <TabsContent value="zodiac" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                    What's your zodiac sign?
                  </Label>
                  
                  <RadioGroup
                    value={values.zodiacSign}
                    onValueChange={(value) => onChange("zodiacSign", value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                        className="w-full"
                      >
                        <Label
                          htmlFor={`zodiac-${value}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ease-in-out",
                            "bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700",
                            "hover:border-pink-400 hover:bg-pink-50/50 dark:hover:border-pink-600 dark:hover:bg-pink-900/30",
                            values.zodiacSign === value 
                              ? "border-pink-500 bg-pink-50 dark:border-pink-500 dark:bg-pink-950/70 ring-2 ring-pink-500" 
                              : "hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={value} 
                              id={`zodiac-${value}`} 
                              className={cn(
                                "border-gray-400 dark:border-gray-600 text-pink-600 dark:text-pink-500",
                                values.zodiacSign === value && "border-pink-600 dark:border-pink-500"
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
                    onClick={() => setActiveTab("love")}
                    className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300"
                  >
                    Back
                  </Button>
                  
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                    disabled={!values.zodiacSign}
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