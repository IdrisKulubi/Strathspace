import { getProfileAnalytics } from "@/lib/actions/profile-analytics.actions";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    // Only allow users to view their own analytics
    if (userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const analytics = await getProfileAnalytics(userId);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 