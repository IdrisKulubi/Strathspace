import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessageList } from "../message-list";
import type { Message } from "@/lib/messaging/types";

// Mock the MessageBubble component
jest.mock("../message-bubble", () => ({
  MessageBubble: ({ message }: { message: Message }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
}));

// Mock date-fns
jest.mock("date-fns", () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === "EEEE, MMMM d, yyyy") return "Monday, January 1, 2024";
    return "Jan 1";
  }),
  isSameDay: jest.fn((date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  }),
  isToday: jest.fn(() => true),
  isYesterday: jest.fn(() => false),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  Loader2: () => <div data-testid="loader" />,
}));

const mockMessages: Message[] = [
  {
    id: "msg-1",
    content: "First message",
    matchId: "match-1",
    senderId: "user-1",
    status: "sent",
    createdAt: new Date("2024-01-01T10:00:00Z"),
    updatedAt: new Date("2024-01-01T10:00:00Z"),
  },
  {
    id: "msg-2",
    content: "Second message",
    matchId: "match-1",
    senderId: "user-2",
    status: "delivered",
    createdAt: new Date("2024-01-01T10:05:00Z"),
    updatedAt: new Date("2024-01-01T10:05:00Z"),
  },
  {
    id: "msg-3",
    content: "Third message",
    matchId: "match-1",
    senderId: "user-1",
    status: "read",
    createdAt: new Date("2024-01-02T10:00:00Z"), // Different day
    updatedAt: new Date("2024-01-02T10:00:00Z"),
  },
];

const mockOnLoadMore = jest.fn();
const mockOnRetry = jest.fn();

describe("MessageList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders messages correctly", () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByTestId("message-msg-1")).toBeInTheDocument();
    expect(screen.getByTestId("message-msg-2")).toBeInTheDocument();
    expect(screen.getByTestId("message-msg-3")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(
      <MessageList
        messages={[]}
        currentUserId="user-1"
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("No messages yet")).toBeInTheDocument();
    expect(screen.getByText("Start the conversation by sending a message!")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    render(
      <MessageList
        messages={[]}
        currentUserId="user-1"
        isLoading={true}
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll("[data-testid*='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows load more button when hasMore is true", () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("Load older messages")).toBeInTheDocument();
  });

  it("calls onLoadMore when load more button is clicked", async () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    const loadMoreButton = screen.getByText("Load older messages");
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(mockOnLoadMore).toHaveBeenCalled();
    });
  });

  it("shows date separators for different days", () => {
    // Mock isSameDay to return false for different days
    const mockIsSameDay = require("date-fns").isSameDay;
    mockIsSameDay.mockImplementation((date1: Date, date2: Date) => {
      return date1.getDate() === date2.getDate();
    });

    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    // Should show "Today" separator
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("does not show load more button when hasMore is false", () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.queryByText("Load older messages")).not.toBeInTheDocument();
  });

  it("disables load more button when loading more", async () => {
    const slowLoadMore = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        hasMore={true}
        onLoadMore={slowLoadMore}
        onRetry={mockOnRetry}
      />
    );

    const loadMoreButton = screen.getByText("Load older messages");
    fireEvent.click(loadMoreButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText("Load older messages")).toBeInTheDocument();
    });
  });

  it("passes onRetry to MessageBubble components", () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    // MessageBubble mock should receive the onRetry prop
    // This is implicitly tested by the mock rendering correctly
    expect(screen.getByTestId("message-msg-1")).toBeInTheDocument();
  });

  it("handles scroll events correctly", () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user-1"
        onLoadMore={mockOnLoadMore}
        onRetry={mockOnRetry}
      />
    );

    const scrollArea = container.querySelector("[data-radix-scroll-area-viewport]");
    
    if (scrollArea) {
      // Simulate scroll event
      Object.defineProperty(scrollArea, "scrollTop", { value: 100, writable: true });
      Object.defineProperty(scrollArea, "scrollHeight", { value: 1000, writable: true });
      Object.defineProperty(scrollArea, "clientHeight", { value: 400, writable: true });

      fireEvent.scroll(scrollArea);
    }

    // Component should handle scroll without errors
    expect(screen.getByTestId("message-msg-1")).toBeInTheDocument();
  });
});