import { useEffect, useState } from "react";
import { ProfileAnalytics } from "@/lib/actions/profile-analytics.actions";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {  Crown, Heart, Eye, Clock, Trophy, ArrowUp, Users } from "lucide-react";
import { FaFire } from "react-icons/fa";
import { cn } from "@/lib/utils";

// Import recharts for trend visualization
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface ProfileAnalyticsProps {
  userId: string;
}

export function ProfileAnalyticsView({ userId }: ProfileAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/profile/analytics?userId=${userId}`);
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-pink-100/50 dark:bg-pink-950/30 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const statCards = [
    {
      title: "Profile Visits",
      value: analytics.visitCount,
      icon: Eye,
      description: "people checked you out today",
      gradient: "from-blue-500 to-purple-500",
    },
    {
      title: "Match Rate",
      value: `${(analytics.matchRatio * 100).toFixed(1)}%`,
      icon: Heart,
      description: "of your likes match",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      title: "Total Matches",
      value: analytics.matchCount,
      icon: FaFire,
      description: "connections made",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  // Format peak hours data for the chart
  const peakHoursData = analytics.peakHours.map(hour => ({
    hour: `${hour.hour}:00`,
    visits: hour.count,
  }));

  // Format weekly trends data
  const weeklyTrendsData = analytics.weeklyTrends.days.map((day, index) => ({
    day,
    visits: analytics.weeklyTrends.visits[index],
    matches: analytics.weeklyTrends.matches[index],
  }));

  return (
    <div className="space-y-6">
      {/* Effectiveness Score */}
      <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/50 dark:to-purple-950/50 border-pink-200 dark:border-pink-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Profile Score</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Top {100 - analytics.comparisonStats.percentileRank}%
            </span>
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
              {analytics.effectivenessScore}
            </span>
          </div>
        </div>
        <Progress 
          value={Math.min(analytics.effectivenessScore, 100)} 
          className="h-2 bg-pink-100 dark:bg-pink-950"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {analytics.effectivenessScore > 80 
            ? "Yasss! Your profile is slaying! 💅✨" 
            : analytics.effectivenessScore > 50 
            ? "Not bad bestie, but you can do better! 💫" 
            : "Time for a glow up! Let's make that profile pop! 💖"}
        </p>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={index}
            className={cn(
              "p-4 border-pink-100 dark:border-pink-900",
              "bg-gradient-to-br from-white to-pink-50/50",
              "dark:from-background dark:to-pink-950/30",
              "hover:shadow-lg transition-shadow duration-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br",
                stat.gradient,
                "text-white"
              )}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">
                  {stat.title}
                </h4>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly Goals */}
      <Card className="p-6 border-pink-100 dark:border-pink-900 bg-gradient-to-br from-white to-pink-50/50 dark:from-background dark:to-pink-950/30">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Weekly Goals</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Profile Visits</span>
              <span>{analytics.weeklyGoals.visitProgress} / {analytics.weeklyGoals.visitGoal}</span>
            </div>
            <Progress 
              value={(analytics.weeklyGoals.visitProgress / analytics.weeklyGoals.visitGoal) * 100}
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>New Matches</span>
              <span>{analytics.weeklyGoals.matchProgress} / {analytics.weeklyGoals.matchGoal}</span>
            </div>
            <Progress 
              value={(analytics.weeklyGoals.matchProgress / analytics.weeklyGoals.matchGoal) * 100}
              className="h-2"
            />
          </div>
        </div>
      </Card>

      {/* Weekly Trends */}
      <Card className="p-6 border-pink-100 dark:border-pink-900 bg-gradient-to-br from-white to-pink-50/50 dark:from-background dark:to-pink-950/30">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUp className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold">Weekly Trends</h3>
        </div>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrendsData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="visits" 
                stroke="#ec4899" 
                strokeWidth={2}
                name="Visits"
              />
              <Line 
                type="monotone" 
                dataKey="matches" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Matches"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Peak Hours */}
      <Card className="p-6 border-pink-100 dark:border-pink-900 bg-gradient-to-br from-white to-pink-50/50 dark:from-background dark:to-pink-950/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Peak Hours</h3>
          </div>
          <span className="text-sm text-muted-foreground">Best times to be active</span>
        </div>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakHoursData}>
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="visits" 
                fill="url(#peakHoursGradient)" 
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="peakHoursGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Comparison Stats */}
      <Card className="p-6 border-pink-100 dark:border-pink-900 bg-gradient-to-br from-white to-pink-50/50 dark:from-background dark:to-pink-950/30">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold">How You Compare</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Profile Visits</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{analytics.visitCount}</p>
              <p className="text-sm text-muted-foreground mb-1">vs {analytics.comparisonStats.avgVisits} avg</p>
            </div>
            <Progress 
              value={(analytics.visitCount / analytics.comparisonStats.avgVisits) * 100}
              className="h-1 mt-2"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Matches</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{analytics.matchCount}</p>
              <p className="text-sm text-muted-foreground mb-1">vs {analytics.comparisonStats.avgMatches} avg</p>
            </div>
            <Progress 
              value={(analytics.matchCount / analytics.comparisonStats.avgMatches) * 100}
              className="h-1 mt-2"
            />
          </div>
        </div>
      </Card>
    </div>
  );
} 