'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,  PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";

// Static data for our growth stats
const GROWTH_DATA = [
  { month: 'Jan', users: 2412 },
  { month: 'Feb', users: 4556 },
  { month: 'Mar', users: 6013 },
];

const ENGAGEMENT_DATA = [
  { name: 'Daily Active', value: 1230 },
  { name: 'Weekly Active', value: 5650 },
  { name: 'Monthly Active', value: 6205 },
];

const RETENTION_DATA = [
  { name: 'Retained', value: 87 },
  { name: 'Churned', value: 13 },
];

const GENDER_DATA = [
  { name: 'Women', value: 44 },
  { name: 'Men', value: 54 },
  { name: 'Non-Binary', value: 2 },
];

const COLORS = ['#FF6B8B', '#36A2EB', '#4BC0C0', '#9966FF', '#FF9F40'];

export default function StatsPage() {
  return (
    <div className="container mx-auto py-10 space-y-8 max-w-6xl">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-pink-500 hover:bg-pink-600 text-white px-4 py-1">2 MONTHS MILESTONE</Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
          Strathspace Growth Metrics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
          After just 2 months, we&apos;ve achieved remarkable results. Here&apos;s a look at our key performance indicators.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Icons.users className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">6013</div>
            <p className="text-xs text-muted-foreground mt-1">
              +94% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-pink-500"
            >
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Industry average is 32%
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches Created</CardTitle>
            <Icons.heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1230</div>
            <p className="text-xs text-muted-foreground mt-1">
              78% success rate
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Icons.message className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5650</div>
            <p className="text-xs text-muted-foreground mt-1">
              total messages sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>User Growth Trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={GROWTH_DATA}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px'
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#FF6B8B"
                    fill="#FF6B8B"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={RETENTION_DATA}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {RETENTION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#FF6B8B' : '#CCCCCC'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={GENDER_DATA}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {GENDER_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ENGAGEMENT_DATA}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px'
                    }}
                  />
                  <Bar dataKey="value" fill="#FF6B8B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Session</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-pink-500"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">18.4m</div>
            <p className="text-xs text-muted-foreground mt-1">
              +32% from launch
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-pink-500"
            >
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on user surveys
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profiles Completed</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-pink-500"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">93%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Industry avg. is 71%
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-pink-500"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">192%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Month-over-month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
