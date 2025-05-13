"use client";
import { useState } from "react";
import { User } from "next-auth";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MoreHorizontal,
  Shield,
  UserX,
  ImageIcon,
  Eye,
  Trash2,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { deleteUserImage, deleteUser, updateUserRole } from "@/lib/actions/admin.actions";
import Image from "next/image";
export interface UserWithProfile extends User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActive: Date | string;
  isOnline: boolean | null;
  profilePhoto: string | null;
  phoneNumber: string;
  photos?: string[];
  role: "user" | "admin" | null;
  profileCompleted: boolean;
  profile?: {
    id?: string;
    userId?: string;
    photos?: string[] | null;
    profileCompleted?: boolean;
    [key: string]: unknown; // For other properties that might exist
  };
}

interface UserManagementProps {
  users: UserWithProfile[];
}

export function UserManagement({ users }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [viewMode, setViewMode] = useState<"details" | "images">("details");

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date consistently
  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return format(date, "MMM d, yyyy");
  };

  // Format time consistently
  const formatDateTime = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return format(date, "MMM d, yyyy HH:mm");
  };

  // Convert string dates to Date objects for UserAvatar component
  const prepareUserForAvatar = (user: UserWithProfile) => {
    if (!user) return null;
    return {
      ...user,
      lastActive: typeof user.lastActive === 'string' ? new Date(user.lastActive) : user.lastActive,
      createdAt: typeof user.createdAt === 'string' ? new Date(user.createdAt) : user.createdAt,
      updatedAt: typeof user.updatedAt === 'string' ? new Date(user.updatedAt) : user.updatedAt,
    };
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-primary">User Management</CardTitle>
            <CardDescription>
              Manage users, moderate content, and update permissions
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar user={prepareUserForAvatar(user)} />
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "outline"}
                    className={
                      user.role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {user.role || "user"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.profileCompleted ? "success" : "outline"}
                    className={
                      user.profileCompleted
                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                        : ""
                    }
                  >
                    {user.profileCompleted ? "Active" : "Incomplete"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(user.lastActive)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setViewMode("details");
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setViewMode("images");
                        }}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Moderate Images
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (user.id) {
                            updateUserRole(
                              user.id, 
                              user.role === "admin" ? "user" : "admin"
                            );
                          }
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this user? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (user.id) {
                                  deleteUser(user.id);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <UserAvatar user={prepareUserForAvatar(selectedUser)} />
                {selectedUser.name}
              </DialogTitle>
              <DialogDescription>{selectedUser.email}</DialogDescription>
            </DialogHeader>

            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "details" | "images")}
              className="flex-1 overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">User Details</TabsTrigger>
                <TabsTrigger value="images">Profile Images</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="h-full">
                <ScrollArea className="h-[calc(80vh-180px)]">
                  <div className="space-y-6 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-muted-foreground">User ID</h3>
                        <p className="text-sm">{selectedUser.id}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-muted-foreground">Role</h3>
                        <Badge
                          variant={selectedUser.role === "admin" ? "default" : "outline"}
                        >
                          {selectedUser.role || "user"}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-medium text-muted-foreground">Last Active</h3>
                        <p className="text-sm">
                          {formatDateTime(selectedUser.lastActive)}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-muted-foreground">Account Status</h3>
                        <Badge
                          variant={selectedUser.profileCompleted ? "success" : "outline"}
                        >
                          {selectedUser.profileCompleted ? "Complete" : "Incomplete"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="images" className="h-full">
                <ScrollArea className="h-[calc(80vh-180px)]">
                  <div className="p-4">
                    <h3 className="text-lg font-medium mb-4">User Photos</h3>
                    {selectedUser.photos && selectedUser.photos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedUser.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <div className="rounded-md aspect-square overflow-hidden relative w-full">
                              <Image
                                src={photo}
                                alt={`${selectedUser.name}'s photo ${index + 1}`}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Image</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this image? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        if (selectedUser.id) {
                                          deleteUserImage(selectedUser.id, photo);
                                        }
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        This user has no profile photos
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
} 