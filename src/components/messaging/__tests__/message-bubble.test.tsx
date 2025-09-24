import { render, screen, fireEvent } from "@testing-library/react";
import { MessageBubble } from "../message-bubble";
import type { Message } from "@/lib/messaging/types";

// Mock date-fns to have consistent test results
jest.mock("date-fns", () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === "HH:mm") return "14:30";
    if (formatStr === "PPpp") return "January 1st, 2024 at 2:30:00 PM GMT";
    return "Jan 1, 14:30";
  }),
  isToday: jest.fn(() => true),
  isYesterday: jest.fn(() => false),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  RefreshCw: () => <div data-testid="refresh-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
}));

const mockMessage: Message = {
  id: "test-message-1",
  content: "Hello, this is a test message!",
  matchId: "match-1",
  senderId: "user-1",
  status: "sent",
  createdAt: new Date("2024-01-01T14:30:00Z"),
  updatedAt: new Date("2024-01-01T14:30:00Z"),
};

const mockOnRetry = jest.fn();

describe("MessageBubble", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders message content correctly", () => {
    render(
      <MessageBubble
        message={mockMessage}
        currentUserId="user-2"
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("Hello, this is a test message!")).toBeInTheDocument();
    expect(screen.getByText("14:30")).toBeInTheDocument();
  });

  it("applies correct styling for current user messages", () => {
    const { container } = render(
      <MessageBubble
        message={mockMessage}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    const messageContainer = container.querySelector(".ml-auto");
    expect(messageContainer).toBeInTheDocument();
    
    const messageBubble = container.querySelector(".from-pink-500");
    expect(messageBubble).toBeInTheDocument();
  });

  it("applies correct styling for other user messages", () => {
    const { container } = render(
      <MessageBubble
        message={mockMessage}
        currentUserId="user-2"
        onRetry={mockOnRetry}
      />
    );

    const messageContainer = container.querySelector(".mr-auto");
    expect(messageContainer).toBeInTheDocument();
    
    const messageBubble = container.querySelector(".bg-secondary");
    expect(messageBubble).toBeInTheDocument();
  });

  it("shows status indicators for current user messages", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, status: "delivered" }}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("✓✓")).toBeInTheDocument();
  });

  it("shows read status with different styling", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, status: "read" }}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    const readStatus = screen.getByText("✓✓");
    expect(readStatus).toHaveClass("text-blue-400");
  });

  it("shows retry button for failed messages", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, status: "failed" }}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByText("Retry");
    expect(retryButton).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, status: "failed" }}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledWith(mockMessage);
  });

  it("shows optimistic message styling", () => {
    const { container } = render(
      <MessageBubble
        message={{ ...mockMessage, isOptimistic: true }}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    const messageBubble = container.querySelector(".opacity-70");
    expect(messageBubble).toBeInTheDocument();
    
    expect(screen.getByText("Sending...")).toBeInTheDocument();
  });

  it("shows retrying state correctly", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, status: "failed", isRetrying: true }}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("Retrying...")).toBeInTheDocument();
    
    const retryButton = screen.getByRole("button");
    expect(retryButton).toBeDisabled();
  });

  it("adjusts styling based on message length", () => {
    const shortMessage = { ...mockMessage, content: "Hi!" };
    const { container: shortContainer } = render(
      <MessageBubble
        message={shortMessage}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    expect(shortContainer.querySelector(".text-sm")).toBeInTheDocument();

    const longMessage = {
      ...mockMessage,
      content: "This is a very long message that should trigger different styling because it exceeds the normal message length threshold and should be displayed with different padding and text size.",
    };
    const { container: longContainer } = render(
      <MessageBubble
        message={longMessage}
        currentUserId="user-1"
        onRetry={mockOnRetry}
      />
    );

    expect(longContainer.querySelector(".p-4")).toBeInTheDocument();
  });

  it("does not show status indicators for other user messages", () => {
    render(
      <MessageBubble
        message={{ ...mockMessage, status: "delivered" }}
        currentUserId="user-2"
        onRetry={mockOnRetry}
      />
    );

    expect(screen.queryByText("✓✓")).not.toBeInTheDocument();
  });
});