"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StudyPreferencesInputProps {
  values: {
    preferredStudyTime?: string;
    studyStyle?: string;
    subjectInterests?: string[];
    groupSize?: string;
    academicGoals?: string[];
  };
  onChange: (field: string, value: string | string[]) => void;
  errors?: {
    preferredStudyTime?: string;
    studyStyle?: string;
    subjectInterests?: string;
    groupSize?: string;
    academicGoals?: string;
  };
}

const studyTimes = [
  "Early Morning (6AM-9AM)",
  "Morning (9AM-12PM)",
  "Afternoon (12PM-5PM)",
  "Evening (5PM-9PM)",
  "Night (9PM-12AM)",
];

const studyStyles = [
  "Silent Study",
  "Background Music",
  "Group Discussion",
  "Active Learning",
  "Mixed Approach",
];

const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Engineering",
  "Business",
  "Economics",
  "Psychology",
  "Literature",
  "History",
  "Art & Design",
  "Languages",
  "Medicine",
  "Law",
];

const groupSizes = [
  "Solo Study",
  "Pairs",
  "Small Group (3-4)",
  "Medium Group (5-7)",
  "Large Group (8+)",
];

const academicGoals = [
  "Improve Grades",
  "Deep Understanding",
  "Research Skills",
  "Exam Preparation",
  "Project Collaboration",
  "Skill Development",
  "Career Preparation",
  "Knowledge Sharing",
  "Academic Writing",
  "Presentation Skills",
];

export function StudyPreferencesInput({
  values,
  onChange,
  errors,
}: StudyPreferencesInputProps) {
  const handleArrayToggle = (field: string, value: string) => {
    const currentValues = values[field as keyof typeof values] as string[] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onChange(field, newValues);
  };

  return (
    <div className="space-y-8">
      {/* Preferred Study Time */}
      <div className="space-y-4">
        <Label>When do you prefer to study?</Label>
        <RadioGroup
          value={values.preferredStudyTime}
          onValueChange={(value) => onChange("preferredStudyTime", value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-2"
        >
          {studyTimes.map((time) => (
            <div key={time} className="flex items-center space-x-2">
              <RadioGroupItem value={time} id={time} />
              <Label htmlFor={time}>{time}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors?.preferredStudyTime && (
          <p className="text-sm text-red-500">{errors.preferredStudyTime}</p>
        )}
      </div>

      {/* Study Style */}
      <div className="space-y-4">
        <Label>What's your preferred study style?</Label>
        <RadioGroup
          value={values.studyStyle}
          onValueChange={(value) => onChange("studyStyle", value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-2"
        >
          {studyStyles.map((style) => (
            <div key={style} className="flex items-center space-x-2">
              <RadioGroupItem value={style} id={style} />
              <Label htmlFor={style}>{style}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors?.studyStyle && (
          <p className="text-sm text-red-500">{errors.studyStyle}</p>
        )}
      </div>

      {/* Subject Interests */}
      <div className="space-y-4">
        <Label>What subjects interest you?</Label>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => {
            const isSelected = values.subjectInterests?.includes(subject);
            return (
              <Badge
                key={subject}
                variant="outline"
                className={cn(
                  "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors",
                  isSelected &&
                    "bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
                )}
                onClick={() => handleArrayToggle("subjectInterests", subject)}
              >
                {subject}
              </Badge>
            );
          })}
        </div>
        {errors?.subjectInterests && (
          <p className="text-sm text-red-500">{errors.subjectInterests}</p>
        )}
      </div>

      {/* Group Size */}
      <div className="space-y-4">
        <Label>Preferred group size?</Label>
        <RadioGroup
          value={values.groupSize}
          onValueChange={(value) => onChange("groupSize", value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-2"
        >
          {groupSizes.map((size) => (
            <div key={size} className="flex items-center space-x-2">
              <RadioGroupItem value={size} id={size} />
              <Label htmlFor={size}>{size}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors?.groupSize && (
          <p className="text-sm text-red-500">{errors.groupSize}</p>
        )}
      </div>

      {/* Academic Goals */}
      <div className="space-y-4">
        <Label>What are your academic goals?</Label>
        <div className="flex flex-wrap gap-2">
          {academicGoals.map((goal) => {
            const isSelected = values.academicGoals?.includes(goal);
            return (
              <Badge
                key={goal}
                variant="outline"
                className={cn(
                  "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors",
                  isSelected &&
                    "bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
                )}
                onClick={() => handleArrayToggle("academicGoals", goal)}
              >
                {goal}
              </Badge>
            );
          })}
        </div>
        {errors?.academicGoals && (
          <p className="text-sm text-red-500">{errors.academicGoals}</p>
        )}
      </div>
    </div>
  );
} 