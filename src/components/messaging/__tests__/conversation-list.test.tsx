import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationList } from "../conversation-list";
import type { Conversation } from "@/lib/messaging/types";

// Mock date-fns
jest.mock("date-fns", () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === "HH:mm") return "14:30";
    if (formatStr === "MMM d") return "Jan 1";
    return "Jan 1";
  }),
  isToday: jest.fn(() => true),
  isYesterday: jest.fn(() => false),
}));

const mockConversations: Conversation[] = [
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
      content: "Hey, how are you doing?",
      matchId: "match-1",
      senderId: "user-1",
      status: "delivered",
      createdAt: new Date("2024-01-01T14:30:00Z"),
      updatedAt: new Date("2024-01-01T14:30:00Z"),
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
      content: "Thanks for the help!",
      matchId: "match-2",
      senderId: "current-user",
      status: "read",
      createdAt: new Date("2024-01-01T12:00:00Z"),
      updatedAt: new Date("2024-01-01T12:00:00Z"),
    },
    unreadCount: 0,
    updatedAt: new Date("2024-01-01T12:00:00Z"),
  },
  {
    matchId: "match-3",
    otherUser: {
      id: "user-3",
      name: "Carol Davis",
      image: "https://example.com/carol.jpg",
      isOnline: true,
    },
    lastMessage: undefined,
    unreadCount: 0,
    updatedAt: new Date("2024-01-01T10:00:00Z"),
  },
];

const mockOnConversationSelect = jest.fn();

describe("ConversationList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders conversations correctly", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Carol Davis")).toBeInTheDocument();
  });

  it("shows last message preview correctly", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByText("Hey, how are you doing?")).toBeInTheDocument();
    expect(screen.getByText("You: Thanks for the help!")).toBeInTheDocument();
  });

  it("shows unread message count", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows online status indicator", () => {
    const { container } = render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    const onlineIndicators = container.querySelectorAll(".bg-green-500");
    expect(onlineIndicators).toHaveLength(2); // Alice and Carol are online
  });

  it("calls onConversationSelect when conversation is clicked", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    const aliceConversation = screen.getByText("Alice Johnson").closest("[role='button'], div[class*='cursor-pointer']");
    if (aliceConversation) {
      fireEvent.click(aliceConversation);
      expect(mockOnConversationSelect).toHaveBeenCalledWith("match-1");
    }
  });

  it("highlights active conversation", () => {
    const { container } = render(
      <ConversationList
        conversations={mockConversations}
        activeConversationId="match-1"
        onConversationSelect={mockOnConversationSelect}
      />
    );

    const activeConversation = container.querySelector(".ring-2");
    expect(activeConversation).toBeInTheDocument();
  });

  it("shows empty state when no conversations", () => {
    render(
      <ConversationList
        conversations={[]}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByText("Start matching to begin conversations!")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <ConversationList
        conversations={[]}
        isLoading={true}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    // Should show skeleton loaders - check for skeleton class instead
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows 'No messages yet' for conversations without messages", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("truncates long messages", () => {
    const conversationWithLongMessage: Conversation = {
      matchId: "match-long",
      otherUser: {
        id: "user-long",
        name: "Long Message User",
        isOnline: false,
      },
      lastMessage: {
        id: "msg-long",
        content: "This is a very long message that should be truncated because it exceeds the normal display length for conversation previews in the list",
        matchId: "match-long",
        senderId: "user-long",
        status: "sent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      unreadCount: 0,
      updatedAt: new Date(),
    };

    render(
      <ConversationList
        conversations={[conversationWithLongMessage]}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    const truncatedText = screen.getByText(/This is a very long message that should be truncat/);
    expect(truncatedText.textContent).toContain("...");
  });

  it("shows user initials when no avatar image", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    // Bob Smith has no image, so should show initials "BS"
    expect(screen.getByText("BS")).toBeInTheDocument();
  });

  it("formats timestamps correctly", () => {
    render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    const timestamps = screen.getAllByText("14:30");
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it("applies unread styling correctly", () => {
    const { container } = render(
      <ConversationList
        conversations={mockConversations}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    // Alice's conversation has unread messages, should have special styling
    const unreadConversation = container.querySelector(".border-primary\\/30");
    expect(unreadConversation).toBeInTheDocument();
  });

  it("shows 99+ for high unread counts", () => {
    const conversationWithManyUnread: Conversation = {
      ...mockConversations[0],
      unreadCount: 150,
    };

    render(
      <ConversationList
        conversations={[conversationWithManyUnread]}
        onConversationSelect={mockOnConversationSelect}
      />
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});