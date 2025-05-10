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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="w-full"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="personality" className="flex flex-col items-center gap-1">
            <Brain className="h-4 w-4" />
            <span className="text-xs">Personality</span>
          </TabsTrigger>
          
          <TabsTrigger value="communication" className="flex flex-col items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">Communication</span>
          </TabsTrigger>
          
          <TabsTrigger value="love" className="flex flex-col items-center gap-1">
            <Heart className="h-4 w-4" />
            <span className="text-xs">Love Language</span>
          </TabsTrigger>
          
          <TabsTrigger value="zodiac" className="flex flex-col items-center gap-1">
            <Stars className="h-4 w-4" />
            <span className="text-xs">Zodiac</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Personality type */}
        <TabsContent value="personality" className="mt-0">
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    What's your personality type?
                  </Label>
                  
                  <RadioGroup
                    value={values.personalityType}
                    onValueChange={(value) => onChange("personalityType", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["introvert", "extrovert", "ambivert"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`personality-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.personalityType === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`personality-${value}`} />
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
                    onClick={() => setActiveTab("communication")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600"
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
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    How would you describe your communication style?
                  </Label>
                  
                  <RadioGroup
                    value={values.communicationStyle}
                    onValueChange={(value) => onChange("communicationStyle", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["direct", "thoughtful", "expressive", "analytical"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`communication-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.communicationStyle === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`communication-${value}`} />
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
                    onClick={() => setActiveTab("personality")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("love")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600"
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
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    What's your primary love language?
                  </Label>
                  
                  <RadioGroup
                    value={values.loveLanguage}
                    onValueChange={(value) => onChange("loveLanguage", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["words_of_affirmation", "quality_time", "acts_of_service", "physical_touch", "receiving_gifts"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`love-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.loveLanguage === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`love-${value}`} />
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
                    onClick={() => setActiveTab("communication")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("zodiac")}
                    className="bg-gradient-to-r from-pink-500 to-pink-600"
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
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    What's your zodiac sign?
                  </Label>
                  
                  <RadioGroup
                    value={values.zodiacSign}
                    onValueChange={(value) => onChange("zodiacSign", value)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"].map((value, i) => (
                      <motion.div 
                        key={value}
                        custom={i} 
                        variants={itemVariants}
                      >
                        <Label
                          htmlFor={`zodiac-${value}`}
                          className={`flex items-center justify-between rounded-lg border border-primary/20 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${
                            values.zodiacSign === value ? "bg-primary/10 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={value} id={`zodiac-${value}`} />
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
                    onClick={() => setActiveTab("love")}
                  >
                    Back
                  </Button>
                  
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-green-500 to-green-600"
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