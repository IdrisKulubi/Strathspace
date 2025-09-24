/**
 * Integration tests for messaging error handling and retry mechanisms
 * Tests the complete flow from UI components through error recovery to server actions
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedMessageInput } from '../enhanced-message-input';
import { EnhancedMessageList } from '../enhanced-message-list';
import { ErrorRecovery } from '../error-recovery';

// Mock dependencies
jest.mock('@/lib/actions/messaging.actions', () => ({
  sendMessageAction: jest.fn(),
  getMessages: jest.fn(),
  markMessagesAsDelivered: jest.fn(),
  markConversationAsRead: jest.fn()
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

jest.mock('@/lib/utils/offline-queue', () => ({
  useOfflineQueue: jest.fn(() => ({
    enqueueMessage: jest.fn(() => 'offline_123'),
    getQueuedMessages: jest.fn(() => []),
    getQueuedMessagesForMatch: jest.fn(() => []),
    getStatus: jest.fn(() => ({ 
      queueSize: 0, 
      isOnline: true, 
      failedMessages: 0,
      oldestMessage: null,
      newestMessage: null
    })),
    syncAll: jest.fn(() => Promise.resolve({ successful: 0, failed: 0, errors: [] })),
    clear: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
}));

import { sendMessageAction, getMessages } from '@/lib/actions/messaging.actions';
import { toast } from '@/hooks/use-toast';
import { useOfflineQueue } from '@/lib/utils/offline-queue';

const mockSendMessageAction = sendMessageAction as jest.MockedFunction<typeof sendMessageAction>;
const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;
const mockToast = toast as jest.MockedFunction<typeof toast>;
const mockUseOfflineQueue = useOfflineQueue as jest.MockedFunction<typeof useOfflineQueue>;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Reset all mocks
  mockSendMessageAction.mockClear();
  mockGetMessages.mockClear();
  mockToast.mockClear();
  
  // Reset navigator.onLine
  (navigator as any).onLine = true;
  
  // Reset offline queue mock
  const mockQueue = {
    enqueueMessage: jest.fn(() => 'offline_123'),
    getQueuedMessages: jest.fn(() => []),
    getQueuedMessagesForMatch: jest.fn(() => []),
    getStatus: jest.fn(() => ({ 
      queueSize: 0, 
      isOnline: true, 
      failedMessages: 0,
      oldestMessage: null,
      newestMessage: null
    })),
    syncAll: jest.fn(() => Promise.resolve({ successful: 0, failed: 0, errors: [] })),
    clear: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  
  mockUseOfflineQueue.mockReturnValue(mockQueue);
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('Messaging Error Handling Integration', () => {
  describe('EnhancedMessageInput Error Handling', () => {
    const defaultProps = {
      matchId: 'match-123',
      onSend: jest.fn()
    };

    it('should handle successful message sending', async () => {
      const onSend = jest.fn().mockResolvedValue(undefined);
      
      render(<EnhancedMessageInput {...defaultProps} onSend={onSend} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button');
      
      await userEvent.type(input, 'Hello world');
      await userEvent.click(sendButton);
      
      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('Hello world');
      });
      
      // Input should be cleared after successful send
      expect(input).toHaveValue('');
    });

    it('should handle send failures with retry', async () => {
      const onSend = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);
      
      render(<EnhancedMessageInput {...defaultProps} onSend={onSend} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button');
      
      await userEvent.type(input, 'Hello world');
      await userEvent.click(sendButton);
      
      // Should show error recovery component
      await waitFor(() => {
        expect(screen.getByText('Connection issue')).toBeInTheDocument();
      });
      
      // Click retry button
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(onSend).toHaveBeenCalledTimes(2);
      });
    });

    it('should queue messages when offline', async () => {
      const mockQueue = mockUseOfflineQueue();
      (navigator as any).onLine = false;
      
      const onSend = jest.fn();
      
      render(<EnhancedMessageInput {...defaultProps} onSend={onSend} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button');
      
      await userEvent.type(input, 'Offline message');
      await userEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockQueue.enqueueMessage).toHaveBeenCalledWith('match-123', 'Offline message');
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Message queued",
        description: "Message will be sent when connection is restored",
        variant: "default"
      });
    });

    it('should show network status indicator when offline', () => {
      (navigator as any).onLine = false;
      
      render(<EnhancedMessageInput {...defaultProps} onSend={jest.fn()} />);
      
      expect(screen.getByText('Offline - Messages will be queued')).toBeInTheDocument();
    });

    it('should show queued messages indicator', () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getQueuedMessagesForMatch.mockReturnValue([
        {
          id: 'queued-1',
          matchId: 'match-123',
          content: 'Queued message',
          timestamp: new Date(),
          attempts: 0
        }
      ]);
      
      render(<EnhancedMessageInput {...defaultProps} onSend={jest.fn()} />);
      
      expect(screen.getByText('1 message queued')).toBeInTheDocument();
    });

    it('should handle character limit validation', async () => {
      render(<EnhancedMessageInput {...defaultProps} onSend={jest.fn()} maxLength={10} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      await userEvent.type(input, 'This message is too long');
      
      // Should be truncated to 10 characters
      expect(input).toHaveValue('This messa');
      
      // Should show character limit indicator
      expect(screen.getByText('10/10')).toBeInTheDocument();
      expect(screen.getByText('Character limit reached')).toBeInTheDocument();
    });

    it('should handle typing indicators', async () => {
      const onTyping = jest.fn();
      
      render(<EnhancedMessageInput {...defaultProps} onSend={jest.fn()} onTyping={onTyping} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      await userEvent.type(input, 'Hello');
      
      expect(onTyping).toHaveBeenCalledWith(true);
      
      // Should stop typing after timeout
      await waitFor(() => {
        expect(onTyping).toHaveBeenCalledWith(false);
      }, { timeout: 3000 });
    });
  });

  describe('EnhancedMessageList Error Handling', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello',
        matchId: 'match-123',
        senderId: 'user-1',
        status: 'sent' as const,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        sender: { id: 'user-1', name: 'User 1', image: null }
      },
      {
        id: 'msg-2',
        content: 'Hi there',
        matchId: 'match-123',
        senderId: 'user-2',
        status: 'sent' as const,
        createdAt: new Date('2024-01-01T10:01:00Z'),
        updatedAt: new Date('2024-01-01T10:01:00Z'),
        sender: { id: 'user-2', name: 'User 2', image: null }
      }
    ];

    const defaultProps = {
      matchId: 'match-123',
      messages: mockMessages,
      currentUserId: 'user-1',
      isLoading: false,
      hasMore: false
    };

    it('should display messages correctly', () => {
      render(<EnhancedMessageList {...defaultProps} />);
      
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    it('should handle load more with error recovery', async () => {
      const onLoadMore = jest.fn()
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockResolvedValue(undefined);
      
      render(
        <EnhancedMessageList 
          {...defaultProps} 
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );
      
      const loadMoreButton = screen.getByText('Load older messages');
      await userEvent.click(loadMoreButton);
      
      // Should show error recovery
      await waitFor(() => {
        expect(screen.getByText('Connection issue')).toBeInTheDocument();
      });
      
      // Retry should work
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(onLoadMore).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle refresh with error recovery', async () => {
      const onRefresh = jest.fn()
        .mockRejectedValueOnce(new Error('Refresh failed'))
        .mockResolvedValue(undefined);
      
      render(
        <EnhancedMessageList 
          {...defaultProps} 
          onRefresh={onRefresh}
        />
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      // Should show error recovery
      await waitFor(() => {
        expect(screen.getByText('Connection issue')).toBeInTheDocument();
      });
      
      // Retry should work
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(2);
      });
    });

    it('should display queued messages', () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getQueuedMessagesForMatch.mockReturnValue([
        {
          id: 'queued-1',
          matchId: 'match-123',
          content: 'Queued message',
          timestamp: new Date(),
          attempts: 0
        }
      ]);
      
      render(<EnhancedMessageList {...defaultProps} />);
      
      expect(screen.getByText('Queued message')).toBeInTheDocument();
    });

    it('should handle message retry for queued messages', async () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getQueuedMessagesForMatch.mockReturnValue([
        {
          id: 'queued-1',
          matchId: 'match-123',
          content: 'Failed message',
          timestamp: new Date(),
          attempts: 1,
          error: 'Send failed'
        }
      ]);
      
      render(<EnhancedMessageList {...defaultProps} />);
      
      // Should show retry button for failed message
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockQueue.syncAll).toHaveBeenCalled();
      });
    });

    it('should show loading skeleton', () => {
      render(
        <EnhancedMessageList 
          {...defaultProps} 
          messages={[]}
          isLoading={true}
        />
      );
      
      // Should show loading skeletons
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show empty state', () => {
      render(
        <EnhancedMessageList 
          {...defaultProps} 
          messages={[]}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Start the conversation by sending a message!')).toBeInTheDocument();
    });
  });

  describe('ErrorRecovery Component', () => {
    it('should show network status', () => {
      render(<ErrorRecovery />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show offline status', () => {
      (navigator as any).onLine = false;
      
      render(<ErrorRecovery />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should show queue status', () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getStatus.mockReturnValue({
        queueSize: 3,
        isOnline: true,
        failedMessages: 1,
        oldestMessage: new Date(),
        newestMessage: new Date()
      });
      
      render(<ErrorRecovery />);
      
      expect(screen.getByText('3')).toBeInTheDocument(); // Queue size badge
      expect(screen.getByText('1 failed')).toBeInTheDocument();
    });

    it('should handle retry and sync', async () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getStatus.mockReturnValue({
        queueSize: 2,
        isOnline: true,
        failedMessages: 0,
        oldestMessage: new Date(),
        newestMessage: new Date()
      });
      
      mockQueue.syncAll.mockResolvedValue({
        successful: 2,
        failed: 0,
        errors: []
      });
      
      const onRetry = jest.fn().mockResolvedValue(undefined);
      
      render(<ErrorRecovery onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Retry & Sync');
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
        expect(mockQueue.syncAll).toHaveBeenCalled();
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Messages synced",
        description: "Successfully sent 2 queued messages",
        variant: "default"
      });
    });

    it('should show queue details', async () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getStatus.mockReturnValue({
        queueSize: 3,
        isOnline: true,
        failedMessages: 1,
        oldestMessage: new Date('2024-01-01T10:00:00Z'),
        newestMessage: new Date()
      });
      
      render(<ErrorRecovery />);
      
      const detailsButton = screen.getByText('Details');
      await userEvent.click(detailsButton);
      
      expect(screen.getByText('Total queued:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Failed:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should clear queue', async () => {
      const mockQueue = mockUseOfflineQueue();
      mockQueue.getStatus.mockReturnValue({
        queueSize: 3,
        isOnline: true,
        failedMessages: 0,
        oldestMessage: new Date(),
        newestMessage: new Date()
      });
      
      render(<ErrorRecovery />);
      
      // Open details first
      const detailsButton = screen.getByText('Details');
      await userEvent.click(detailsButton);
      
      const clearButton = screen.getByText('Clear Queue');
      await userEvent.click(clearButton);
      
      expect(mockQueue.clear).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Queue cleared",
        description: "All queued messages have been removed",
        variant: "default"
      });
    });
  });

  describe('End-to-End Error Scenarios', () => {
    it('should handle complete offline to online flow', async () => {
      const mockQueue = mockUseOfflineQueue();
      
      // Start offline
      (navigator as any).onLine = false;
      
      const onSend = jest.fn();
      
      render(<EnhancedMessageInput matchId="match-123" onSend={onSend} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button');
      
      // Send message while offline
      await userEvent.type(input, 'Offline message');
      await userEvent.click(sendButton);
      
      expect(mockQueue.enqueueMessage).toHaveBeenCalledWith('match-123', 'Offline message');
      
      // Go back online
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      // Should trigger sync
      expect(mockQueue.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should handle network error with automatic retry', async () => {
      const onSend = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue(undefined);
      
      render(<EnhancedMessageInput matchId="match-123" onSend={onSend} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button');
      
      await userEvent.type(input, 'Test message');
      await userEvent.click(sendButton);
      
      // Should eventually succeed after retries
      await waitFor(() => {
        expect(onSend).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });
      
      // Input should be cleared after success
      expect(input).toHaveValue('');
    });

    it('should handle server action failures gracefully', async () => {
      mockSendMessageAction.mockRejectedValue(new Error('Server error'));
      
      const onSend = jest.fn().mockImplementation(async (content) => {
        const result = await mockSendMessageAction('match-123', content);
        if (!result.success) {
          throw new Error(result.error);
        }
      });
      
      render(<EnhancedMessageInput matchId="match-123" onSend={onSend} />);
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button');
      
      await userEvent.type(input, 'Test message');
      await userEvent.click(sendButton);
      
      // Should show error recovery
      await waitFor(() => {
        expect(screen.getByText('Connection issue')).toBeInTheDocument();
      });
    });
  });
});