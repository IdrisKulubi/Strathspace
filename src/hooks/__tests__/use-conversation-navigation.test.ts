import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConversationNavigation } from "../use-conversation-navigation";
import { getConversations, markConversationAsRead } from "@/lib/actions/messaging.actions";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock messaging actions
jest.mock("@/lib/actions/messaging.actions", () => ({
  getConversations: jest.fn(),
  markConversationAsRead: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(() => ""),
};

const mockConversations = [
  {
    matchId: "match-1",
    otherUser: {
      id: "user-1",
      name: "Alice Johnson",
      image: "https://example.com/alice.jpg",
      isOnline: true,
    },
    lastMessage: {
      id: "msg-1",
      content: "Hey there!",
      senderId: "user-1",
      createdAt: new Date("2024-01-01T14:30:00Z"),
      status: "delivered" as const,
    },
    unreadCount: 2,
    updatedAt: new Date("2024-01-01T14:30:00Z"),
  },
  {
    matchId: "match-2",
    otherUser: {
      id: "user-2",
      name: "Bob Smith",
      image: undefined,
      isOnline: false,
    },
    lastMessage: {
      id: "msg-2",
      content: "Thanks!",
      senderId: "current-user",
      createdAt: new Date("2024-01-01T12:00:00Z"),
      status: "read" as const,
    },
    unreadCount: 0,
    updatedAt: new Date("2024-01-01T12:00:00Z"),
  },
];

describe("useConversationNavigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (getConversations as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversations,
    });
    (markConversationAsRead as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it("should fetch conversations on mount", async () => {
    renderHook(() => useConversationNavigation());

    await waitFor(() => {
      expect(getConversations).toHaveBeenCalledTimes(1);
    });
  });

  it("should return conversations and loading state", async () => {
    const { result } = renderHook(() => useConversationNavigation());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.conversations).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.conversations).toEqual(mockConversations);
    });
  });

  it("should get active conversation from URL params", () => {
    mockSearchParams.get.mockReturnValue("match-1");

    const { result } = renderHook(() => useConversationNavigation());

    expect(result.current.activeConversationId).toBe("match-1");
  });

  it("should select conversation and update URL", async () => {
    const { result } = renderHook(() => useConversationNavigation());

    await act(async () => {
      result.current.selectConversation("match-2");
    });

    expect(mockRouter.push).toHaveBeenCalledWith("?conversation=match-2", { scroll: false });
    expect(markConversationAsRead).toHaveBeenCalledWith("match-2");
  });

  it("should mark conversation as read and update local state", async () => {
    const { result } = renderHook(() => useConversationNavigation());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.conversations).toEqual(mockConversations);
    });

    await act(async () => {
      await result.current.markAsRead("match-1");
    });

    expect(markConversationAsRead).toHaveBeenCalledWith("match-1");
    
    // Check that unread count was updated locally
    const updatedConversation = result.current.conversations.find(c => c.matchId === "match-1");
    expect(updatedConversation?.unreadCount).toBe(0);
  });

  it("should refresh conversations", async () => {
    const { result } = renderHook(() => useConversationNavigation());

    await act(async () => {
      await result.current.refreshConversations();
    });

    expect(getConversations).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it("should handle fetch error", async () => {
    (getConversations as jest.Mock).mockResolvedValue({
      success: false,
      error: "Network error",
    });

    const { result } = renderHook(() => useConversationNavigation());

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should handle mark as read error gracefully", async () => {
    (markConversationAsRead as jest.Mock).mockRejectedValue(new Error("Network error"));
    
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() => useConversationNavigation());

    await act(async () => {
      await result.current.markAsRead("match-1");
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error marking conversation as read:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should preserve existing URL params when selecting conversation", async () => {
    mockSearchParams.toString.mockReturnValue("tab=messages&filter=unread");

    const { result } = renderHook(() => useConversationNavigation());

    await act(async () => {
      result.current.selectConversation("match-1");
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      "?tab=messages&filter=unread&conversation=match-1",
      { scroll: false }
    );
  });
});