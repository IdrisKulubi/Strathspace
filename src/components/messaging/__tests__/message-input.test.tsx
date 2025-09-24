import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessageInput } from "../message-input";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Send: () => <div data-testid="send-icon" />,
  Loader2: () => <div data-testid="loader" />,
}));

const mockOnSend = jest.fn();
const mockOnTyping = jest.fn();

describe("MessageInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders input field and send button", () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onSend when form is submitted with valid content", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "Hello world!" } });
    fireEvent.click(sendButton);

    expect(mockOnSend).toHaveBeenCalledWith("Hello world!");
  });

  it("clears input after sending message", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
    const sendButton = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "Hello world!" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("sends message on Enter key press", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "Hello world!" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith("Hello world!");
  });

  it("does not send message on Shift+Enter", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "Hello world!" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("calls onTyping when user types", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "H" } });

    expect(mockOnTyping).toHaveBeenCalledWith(true);
  });

  it("stops typing indicator after timeout", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "Hello" } });

    // Fast-forward time to trigger timeout
    jest.advanceTimersByTime(2100);

    expect(mockOnTyping).toHaveBeenCalledWith(false);
  });

  it("disables send button when input is empty", () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const sendButton = screen.getByRole("button");
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when input has content", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "Hello" } });

    expect(sendButton).not.toBeDisabled();
  });

  it("does not send empty or whitespace-only messages", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("respects maxLength prop", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
        maxLength={10}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;

    fireEvent.change(input, { target: { value: "This is a very long message that exceeds the limit" } });

    expect(input.value).toBe("This is a ");
    expect(input.value.length).toBe(10);
  });

  it("shows character count when approaching limit", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
        maxLength={20}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    // Type enough to trigger character count display (80% of limit)
    fireEvent.change(input, { target: { value: "This is a long msg" } });

    expect(screen.getByText("18/20")).toBeInTheDocument();
  });

  it("shows character limit reached message", async () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
        maxLength={10}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "1234567890" } });

    expect(screen.getByText("Character limit reached")).toBeInTheDocument();
  });

  it("disables input when disabled prop is true", () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
        disabled={true}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByRole("button");

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it("uses custom placeholder", () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
        placeholder="Custom placeholder..."
      />
    );

    expect(screen.getByPlaceholderText("Custom placeholder...")).toBeInTheDocument();
  });

  it("shows loading state when sending", async () => {
    const slowOnSend = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <MessageInput
        onSend={slowOnSend}
        onTyping={mockOnTyping}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(sendButton);

    // Should show loading spinner
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows helper text about keyboard shortcuts", () => {
    render(
      <MessageInput
        onSend={mockOnSend}
        onTyping={mockOnTyping}
      />
    );

    expect(screen.getByText("Press Enter to send, Shift+Enter for new line")).toBeInTheDocument();
  });
});