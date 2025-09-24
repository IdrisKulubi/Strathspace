/**
 * Unit tests for message status utility functions
 * These tests cover the status progression logic added in task 8
 */

import { describe, it, expect } from '@jest/globals';

// Status progression utility functions
export const STATUS_ORDER = { 'sent': 0, 'delivered': 1, 'read': 2 } as const;

export type MessageStatus = 'sent' | 'delivered' | 'read';

export function canProgressStatus(
  currentStatus: MessageStatus,
  newStatus: MessageStatus
): boolean {
  return STATUS_ORDER[newStatus] > STATUS_ORDER[currentStatus];
}

export function isValidStatusTransition(
  from: MessageStatus,
  to: MessageStatus
): boolean {
  // Allow any forward progression
  return STATUS_ORDER[to] >= STATUS_ORDER[from];
}

export function getNextStatus(currentStatus: MessageStatus): MessageStatus | null {
  switch (currentStatus) {
    case 'sent':
      return 'delivered';
    case 'delivered':
      return 'read';
    case 'read':
      return null; // No next status
    default:
      return null;
  }
}

export function shouldUpdateStatus(
  currentStatus: MessageStatus,
  newStatus: MessageStatus,
  isOwnMessage: boolean
): boolean {
  // Users cannot update status of their own messages
  if (isOwnMessage) {
    return false;
  }
  
  // Only allow status progression
  return canProgressStatus(currentStatus, newStatus);
}

describe('Message Status Utilities', () => {
  describe('canProgressStatus', () => {
    it('should allow progression from sent to delivered', () => {
      expect(canProgressStatus('sent', 'delivered')).toBe(true);
    });

    it('should allow progression from sent to read', () => {
      expect(canProgressStatus('sent', 'read')).toBe(true);
    });

    it('should allow progression from delivered to read', () => {
      expect(canProgressStatus('delivered', 'read')).toBe(true);
    });

    it('should not allow regression from delivered to sent', () => {
      expect(canProgressStatus('delivered', 'sent')).toBe(false);
    });

    it('should not allow regression from read to delivered', () => {
      expect(canProgressStatus('read', 'delivered')).toBe(false);
    });

    it('should not allow regression from read to sent', () => {
      expect(canProgressStatus('read', 'sent')).toBe(false);
    });

    it('should not allow same status progression', () => {
      expect(canProgressStatus('sent', 'sent')).toBe(false);
      expect(canProgressStatus('delivered', 'delivered')).toBe(false);
      expect(canProgressStatus('read', 'read')).toBe(false);
    });
  });

  describe('isValidStatusTransition', () => {
    it('should allow forward transitions', () => {
      expect(isValidStatusTransition('sent', 'delivered')).toBe(true);
      expect(isValidStatusTransition('sent', 'read')).toBe(true);
      expect(isValidStatusTransition('delivered', 'read')).toBe(true);
    });

    it('should allow same status (no change)', () => {
      expect(isValidStatusTransition('sent', 'sent')).toBe(true);
      expect(isValidStatusTransition('delivered', 'delivered')).toBe(true);
      expect(isValidStatusTransition('read', 'read')).toBe(true);
    });

    it('should not allow backward transitions', () => {
      expect(isValidStatusTransition('delivered', 'sent')).toBe(false);
      expect(isValidStatusTransition('read', 'delivered')).toBe(false);
      expect(isValidStatusTransition('read', 'sent')).toBe(false);
    });
  });

  describe('getNextStatus', () => {
    it('should return correct next status', () => {
      expect(getNextStatus('sent')).toBe('delivered');
      expect(getNextStatus('delivered')).toBe('read');
      expect(getNextStatus('read')).toBe(null);
    });
  });

  describe('shouldUpdateStatus', () => {
    it('should allow status updates for other users messages', () => {
      expect(shouldUpdateStatus('sent', 'delivered', false)).toBe(true);
      expect(shouldUpdateStatus('sent', 'read', false)).toBe(true);
      expect(shouldUpdateStatus('delivered', 'read', false)).toBe(true);
    });

    it('should not allow status updates for own messages', () => {
      expect(shouldUpdateStatus('sent', 'delivered', true)).toBe(false);
      expect(shouldUpdateStatus('sent', 'read', true)).toBe(false);
      expect(shouldUpdateStatus('delivered', 'read', true)).toBe(false);
    });

    it('should not allow status regression for any messages', () => {
      expect(shouldUpdateStatus('delivered', 'sent', false)).toBe(false);
      expect(shouldUpdateStatus('read', 'delivered', false)).toBe(false);
      expect(shouldUpdateStatus('read', 'sent', false)).toBe(false);
    });

    it('should not allow same status updates', () => {
      expect(shouldUpdateStatus('sent', 'sent', false)).toBe(false);
      expect(shouldUpdateStatus('delivered', 'delivered', false)).toBe(false);
      expect(shouldUpdateStatus('read', 'read', false)).toBe(false);
    });
  });

  describe('Status Order Constants', () => {
    it('should have correct status order values', () => {
      expect(STATUS_ORDER.sent).toBe(0);
      expect(STATUS_ORDER.delivered).toBe(1);
      expect(STATUS_ORDER.read).toBe(2);
    });

    it('should maintain proper ordering', () => {
      expect(STATUS_ORDER.sent < STATUS_ORDER.delivered).toBe(true);
      expect(STATUS_ORDER.delivered < STATUS_ORDER.read).toBe(true);
      expect(STATUS_ORDER.sent < STATUS_ORDER.read).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all possible status combinations', () => {
      const statuses: MessageStatus[] = ['sent', 'delivered', 'read'];
      
      for (const from of statuses) {
        for (const to of statuses) {
          // Should not throw errors
          expect(() => canProgressStatus(from, to)).not.toThrow();
          expect(() => isValidStatusTransition(from, to)).not.toThrow();
          expect(() => shouldUpdateStatus(from, to, false)).not.toThrow();
          expect(() => shouldUpdateStatus(from, to, true)).not.toThrow();
        }
      }
    });
  });
});