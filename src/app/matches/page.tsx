import { SimplifiedExplorePage } from '@/components/explore/desktop/simplified-explore-page';
import { getMatches, getLikedProfiles } from "@/lib/actions/explore.actions";
import { getChats } from "@/lib/actions/chat.actions";
import { auth } from '@/auth';


export default async function MatchesPage() {
    const session = await auth();
    const [matchesResult, likesSentResult, chatsResult] = await Promise.all([
        getMatches(),
        getLikedProfiles(),
        getChats()
    ]);

    return (
        <SimplifiedExplorePage
            matches={matchesResult.matches || []}
            likesSent={likesSentResult.profiles || []}
            chats={chatsResult || []}
            currentUser={session?.user}
        >
           <div className="flex items-center justify-center h-full">
                <p className="text-2xl font-bold">Select a conversation to start messaging</p>
            </div>
        </SimplifiedExplorePage>
    )
}
