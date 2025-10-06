"use client";

import React, { useState } from 'react';
import { Profile } from "@/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { ChatSection } from "@/components/chat/chat-modal";
import { ChatWindow } from "@/components/chat/chat-window";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SimplifiedExplorePageProps {
  matches: Profile[];
  likesSent: Profile[];
  chats: any[];
  currentUser: any;
  currentUserProfile?: Profile | null;
  onSelectChat?: (matchId: string) => void;
  onViewProfile?: (profile: Profile) => void;
  markAsRead?: (matchId: string) => void;
  children: React.ReactNode;
}

export const SimplifiedExplorePage: React.FC<SimplifiedExplorePageProps> = ({
    matches,
    likesSent,
    chats,
    currentUser,
    currentUserProfile,
    onSelectChat,
    markAsRead,
    onViewProfile,
    children,
}) => {
    // Helper to dedupe by userId to avoid duplicate React keys and repeated cards
    const dedupeByUserId = (arr: any[]): any[] => {
        const map = new Map<string, any>();
        for (const item of arr || []) {
            if (!map.has(item.userId)) map.set(item.userId, item);
        }
        return Array.from(map.values());
    };

    const uniqueMatches = React.useMemo(() => dedupeByUserId(matches || []), [matches]);
    const uniqueLikesSent = React.useMemo(() => dedupeByUserId(likesSent || []), [likesSent]);

    // Left-tab state and right content views
    const [activeTab, setActiveTab] = useState<"matches" | "messages">("matches");
    const [rightView, setRightView] = useState<"default" | "likes-sent">("default");
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    // Auto-select the first chat when entering the Messages tab for a smoother flow
    React.useEffect(() => {
        if (activeTab === "messages" && !selectedChatId && Array.isArray(chats) && chats.length > 0) {
            setSelectedChatId(chats[0].matchId);
        }
    }, [activeTab, selectedChatId, chats]);

    return (
        <div className="h-screen grid grid-rows-[auto,1fr]">
            {/* Top Navbar */}
            <div className="sticky top-0 z-30 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-500 text-white">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
                    <Link href="/profile" className="flex items-center gap-3 hover:opacity-90">
                        <Avatar className="h-8 w-8 ring-2 ring-white/30">
                            <AvatarImage src={currentUser?.image || undefined} alt={currentUser?.name || "You"} />
                            <AvatarFallback className="bg-white/20">{currentUser?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold hidden sm:block">You</span>
                    </Link>
                    <div className="text-xs sm:text-sm font-medium opacity-90">Matches • Messages</div>
                    <div className="w-8" />
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 min-h-0">
            <div className="col-span-1 border-r overflow-y-auto bg-[#2B1A3D]">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
                    <TabsList className="shrink-0 grid w-full grid-cols-2">
                        <TabsTrigger value="matches">Matches</TabsTrigger>
                        <TabsTrigger value="messages">Messages</TabsTrigger>
                    </TabsList>
                    <TabsContent value="matches" className="flex-grow">
                        {/* Left column: Matches grid with a Tinder-style Likes Sent card on top */}
                        <ScrollArea className="h-[calc(100vh-56px)]">
                            <div className="px-3 py-2 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-3">
                                {/* Likes Sent summary card */}
                                <button
                                    onClick={() => setRightView("likes-sent")}
                                    className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10 bg-gradient-to-br from-amber-400/30 via-pink-500/30 to-fuchsia-600/30 hover:ring-white/20 transition shadow-sm flex items-center justify-center"
                                    aria-label="Open Likes Sent"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                                    <div className="z-10 text-center px-2">
                                        <p className="text-white text-lg font-bold drop-shadow-sm">Likes sent</p>
<p className="text-white/90 text-sm mt-1">{uniqueLikesSent.length} total</p>
                                    </div>
                                </button>

{uniqueMatches.map((match) => (
                                    <button
                                        key={`m-${match.userId}`}
                                        onClick={() => onViewProfile?.(match)}
                                        className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/10 to-rose-500/10 hover:ring-white/20 transition shadow-sm"
                                    >
                                        <Image src={match.profilePhoto || '/default-avatar.png'} alt={match.firstName ?? 'User'} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                        <div className="absolute left-2 bottom-2 right-2 text-left">
                                            <p className="text-white text-sm font-semibold truncate drop-shadow">{match.firstName}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="messages" className="flex-grow overflow-y-auto">
<ChatSection 
                            currentUser={currentUser}
                            onSelectChat={(matchId) => {
                              setSelectedChatId(matchId);
                              setActiveTab("messages");
                              setRightView("default");
                              onSelectChat?.(matchId);
                            }}
                            markAsRead={markAsRead}
                            initialChats={chats}
                            disableNavigation={true}
                            selectedChatId={selectedChatId}
                        />
                    </TabsContent>
                </Tabs>
            </div>
            <div className="col-span-2 min-h-0">
                {rightView === "likes-sent" ? (
                    <div className="h-full w-full px-6 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Likes sent</h2>
                            <button
                              className="text-sm text-muted-foreground hover:text-foreground"
                              onClick={() => setRightView("default")}
                            >
                              Back
                            </button>
                        </div>
{uniqueLikesSent.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-2">
                                    <div className="text-5xl">😎✨</div>
                                    <p className="text-lg font-medium">No likes sent yet</p>
                                    <p className="text-sm text-muted-foreground">Catch a vibe and shoot your shot when you’re ready.</p>
                                </div>
                            </div>
                        ) : (
                            <ScrollArea className="h-[calc(100vh-120px)]">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
{uniqueLikesSent.map((profile) => (
                                        <button
                                            key={`ls-${profile.userId}`}
                                            onClick={() => onViewProfile?.(profile)}
                                            className="group relative overflow-hidden rounded-2xl ring-1 ring-white/10 bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-fuchsia-500/10 hover:ring-white/20 transition shadow-sm aspect-[3/4]"
                                        >
                                            <Image src={profile.profilePhoto || '/default-avatar.png'} alt={profile.firstName ?? 'User'} fill className="object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                            <div className="absolute left-3 bottom-3 right-3 text-left">
                                                <p className="text-white text-base font-semibold truncate drop-shadow">{profile.firstName}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                ) : activeTab === 'messages' && selectedChatId ? (
                    // Two-column: chat window + profile sidebar
                    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                        {/* Chat window */}
                        <div className="min-h-0 border-r">
                            {(() => {
let partner = (uniqueMatches as (Profile & { matchId?: string })[]).find(m => (m as any).matchId === selectedChatId)

                                if (!partner) {
                                    // Fallback: synthesize a minimal partner object from chat preview
                                    const preview = (Array.isArray(chats) ? (chats as any[]) : []).find(c => c.matchId === selectedChatId);
                                    if (preview) {
                                        partner = {
                                            // Minimal fields used by ChatWindow
                                            userId: preview.userId,
                                            firstName: preview.firstName ?? "User",
                                            lastName: "",
                                            profilePhoto: preview.profilePhoto ?? null,
                                            photos: [],
                                            bio: null,
                                            age: null,
                                            gender: null as any,
                                            interests: [],
                                            course: null,
                                            yearOfStudy: null,
                                            phoneNumber: null,
                                            isMatch: true,
                                            createdAt: new Date(),
                                            updatedAt: new Date(),
                                            isVisible: true,
                                            lastActive: new Date(),
                                            isComplete: true,
                                            profileCompleted: true,
                                            lookingFor: null,
                                            anonymous: false,
                                            anonymousAvatar: null,
                                            anonymousRevealRequested: false,
                                            id: "",
                                            role: "user",
                                        } as unknown as Profile;
                                    }
                                }

                                if (!partner) {
                                    return (
                                        <div className="h-full flex items-center justify-center">
                                            <p className="text-muted-foreground">Loading conversation...</p>
                                        </div>
                                    );
                                }

                                return (
                                    <ChatWindow
                                        matchId={selectedChatId}
                                        partner={partner as Profile}
                                        currentUserProfile={currentUserProfile ?? null}
                                        onClose={() => setSelectedChatId(null)}
                                    />
                                );
                            })()}
                        </div>

                        {/* Profile sidebar */}
                        <div className="hidden lg:block min-h-0 overflow-y-auto">
                            {(() => {
let partner = (uniqueMatches as (Profile & { matchId?: string })[]).find(m => (m as any).matchId === selectedChatId)
                                if (!partner) {
                                    const preview = (Array.isArray(chats) ? (chats as any[]) : []).find(c => c.matchId === selectedChatId);
                                    if (preview) {
                                        partner = {
                                            userId: preview.userId,
                                            firstName: preview.firstName ?? "User",
                                            lastName: "",
                                            profilePhoto: preview.profilePhoto ?? null,
                                            photos: [],
                                            bio: null,
                                            age: null,
                                            gender: null as any,
                                            interests: [],
                                            course: null,
                                            yearOfStudy: null,
                                            phoneNumber: null,
                                            isMatch: true,
                                            createdAt: new Date(),
                                            updatedAt: new Date(),
                                            isVisible: true,
                                            lastActive: new Date(),
                                            isComplete: true,
                                            profileCompleted: true,
                                            lookingFor: null,
                                            anonymous: false,
                                            anonymousAvatar: null,
                                            anonymousRevealRequested: false,
                                            id: "",
                                            role: "user",
                                        } as unknown as Profile;
                                    }
                                }
                                if (!partner) return null;
                                return (
                                    <div className="h-full w-full">
                                        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                                            <div className="font-semibold">{partner.firstName}</div>
                                            <div className="text-xs text-muted-foreground">Profile</div>
                                        </div>
                                        <ScrollArea className="h-[calc(100vh-48px)]">
                                            <div className="p-4 space-y-4">
                                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl ring-1 ring-border">
                                                    <Image src={partner.profilePhoto || (partner.photos?.[0] ?? '/default-avatar.png')} alt={partner.firstName ?? 'User'} fill className="object-cover" />
                                                </div>
                                                {partner.bio && (
                                                    <div>
                                                        <div className="text-sm font-medium mb-1">Bio</div>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{partner.bio}</p>
                                                    </div>
                                                )}
                                                {partner.course && (
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div className="p-2 rounded-lg bg-muted/30">
                                                            <div className="text-muted-foreground">Course</div>
                                                            <div className="font-medium">{partner.course}</div>
                                                        </div>
                                                        {partner.yearOfStudy !== null && (
                                                            <div className="p-2 rounded-lg bg-muted/30">
                                                                <div className="text-muted-foreground">Year</div>
                                                                <div className="font-medium">{partner.yearOfStudy}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {!!partner.interests?.length && (
                                                    <div>
                                                        <div className="text-sm font-medium mb-1">Interests</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {partner.interests.map((i) => (
                                                                <span key={i} className="px-2 py-1 rounded-full bg-muted text-xs">{i}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    children
                )}
            </div>
            </div>
        </div>
    )
}
