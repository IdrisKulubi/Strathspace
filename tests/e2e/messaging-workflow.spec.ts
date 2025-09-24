import { test, expect, type Page } from '@playwright/test';

// Test data
const testUsers = {
  user1: {
    email: 'test.user1@strathmore.edu',
    password: 'TestPassword123!',
    name: 'Test User 1'
  },
  user2: {
    email: 'test.user2@strathmore.edu', 
    password: 'TestPassword123!',
    name: 'Test User 2'
  }
};

// Helper functions
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth/signin');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="signin-button"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function createTestMatch(page: Page) {
  // Navigate to explore page and create a match
  await page.goto('/explore');
  await page.click('[data-testid="like-button"]');
  await page.waitForSelector('[data-testid="match-notification"]', { timeout: 5000 });
}

async function navigateToMessaging(page: Page, matchId?: string) {
  if (matchId) {
    await page.goto(`/chat/${matchId}`);
  } else {
    await page.goto('/chat');
    await page.click('[data-testid="conversation-item"]:first-child');
  }
  await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });
}

async function sendMessage(page: Page, content: string) {
  await page.fill('[data-testid="message-input"]', content);
  await page.click('[data-testid="send-button"]');
  
  // Wait for message to appear in the chat
  await page.waitForSelector(`[data-testid="message-bubble"]:has-text("${content}")`, {
    timeout: 5000
  });
}

test.describe('Messaging Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
  });

  test('complete messaging workflow - send and receive messages', async ({ browser }) => {
    // Create two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Step 1: Login both users
      await loginUser(page1, testUsers.user1.email, testUsers.user1.password);
      await loginUser(page2, testUsers.user2.email, testUsers.user2.password);

      // Step 2: Create a match between users (simulate this via API or UI)
      // For now, assume match exists and navigate to messaging
      await navigateToMessaging(page1);
      await navigateToMessaging(page2);

      // Step 3: User 1 sends a message
      const message1 = 'Hello! This is a test message from user 1.';
      await sendMessage(page1, message1);

      // Step 4: Verify message appears for user 1 with correct status
      await expect(page1.locator(`[data-testid="message-bubble"]:has-text("${message1}")`)).toBeVisible();
      await expect(page1.locator('[data-testid="message-status"]:has-text("✓")')).toBeVisible();

      // Step 5: User 2 should receive the message (via periodic fetch)
      await page2.waitForTimeout(5000); // Wait for periodic fetch
      await expect(page2.locator(`[data-testid="message-bubble"]:has-text("${message1}")`)).toBeVisible();

      // Step 6: User 2 sends a reply
      const message2 = 'Hi there! This is a reply from user 2.';
      await sendMessage(page2, message2);

      // Step 7: Verify reply appears for user 2
      await expect(page2.locator(`[data-testid="message-bubble"]:has-text("${message2}")`)).toBeVisible();

      // Step 8: User 1 should receive the reply
      await page1.waitForTimeout(5000); // Wait for periodic fetch
      await expect(page1.locator(`[data-testid="message-bubble"]:has-text("${message2}")`)).toBeVisible();

      // Step 9: Verify message status updates (delivered/read)
      await expect(page1.locator('[data-testid="message-status"]:has-text("✓✓")')).toBeVisible();

      // Step 10: Test message history pagination
      // Send multiple messages to test pagination
      for (let i = 1; i <= 10; i++) {
        await sendMessage(page1, `Test message ${i} for pagination`);
        await page1.waitForTimeout(500);
      }

      // Scroll to top to trigger pagination
      await page1.locator('[data-testid="message-list"]').evaluate(el => {
        el.scrollTop = 0;
      });

      // Wait for older messages to load
      await page1.waitForSelector('[data-testid="loading-more-messages"]', { timeout: 5000 });
      await expect(page1.locator(`[data-testid="message-bubble"]:has-text("${message1}")`)).toBeVisible();

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('message retry functionality', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await navigateToMessaging(page);

    // Simulate network failure by intercepting requests
    await page.route('**/api/messaging/**', route => {
      route.abort('failed');
    });

    // Try to send a message (should fail)
    const failedMessage = 'This message should fail to send';
    await page.fill('[data-testid="message-input"]', failedMessage);
    await page.click('[data-testid="send-button"]');

    // Verify failed message appears with retry option
    await expect(page.locator('[data-testid="message-status"]:has-text("Failed")')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Restore network and retry
    await page.unroute('**/api/messaging/**');
    await page.click('[data-testid="retry-button"]');

    // Verify message is sent successfully
    await expect(page.locator(`[data-testid="message-bubble"]:has-text("${failedMessage}")`)).toBeVisible();
    await expect(page.locator('[data-testid="message-status"]:has-text("✓")')).toBeVisible();
  });

  test('conversation list and navigation', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    
    // Navigate to chat overview
    await page.goto('/chat');
    
    // Verify conversation list loads
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount.greaterThan(0);

    // Click on a conversation
    await page.click('[data-testid="conversation-item"]:first-child');
    
    // Verify navigation to specific conversation
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();

    // Verify conversation header shows partner info
    await expect(page.locator('[data-testid="conversation-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="partner-name"]')).toBeVisible();
  });

  test('message status tracking and read receipts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await loginUser(page1, testUsers.user1.email, testUsers.user1.password);
      await loginUser(page2, testUsers.user2.email, testUsers.user2.password);

      await navigateToMessaging(page1);
      await navigateToMessaging(page2);

      // Send message from user 1
      const testMessage = 'Testing read receipts';
      await sendMessage(page1, testMessage);

      // Verify initial status (sent)
      await expect(page1.locator('[data-testid="message-status"]:has-text("✓")')).toBeVisible();

      // User 2 receives message (delivered status)
      await page2.waitForTimeout(5000);
      await expect(page2.locator(`[data-testid="message-bubble"]:has-text("${testMessage}")`)).toBeVisible();
      
      // Check delivered status on user 1's side
      await page1.waitForTimeout(2000);
      await expect(page1.locator('[data-testid="message-status"]:has-text("✓✓")')).toBeVisible();

      // User 2 marks conversation as read by viewing it
      await page2.locator('[data-testid="message-list"]').click();
      
      // Check read status on user 1's side
      await page1.waitForTimeout(2000);
      const readStatus = page1.locator('[data-testid="message-status"]:has-text("✓✓")');
      await expect(readStatus).toHaveClass(/text-blue/); // Read status should be blue

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('offline message queuing and sync', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await navigateToMessaging(page);

    // Go offline
    await page.context().setOffline(true);

    // Try to send messages while offline
    const offlineMessages = [
      'Message 1 sent while offline',
      'Message 2 sent while offline',
      'Message 3 sent while offline'
    ];

    for (const message of offlineMessages) {
      await page.fill('[data-testid="message-input"]', message);
      await page.click('[data-testid="send-button"]');
      
      // Messages should be queued locally
      await expect(page.locator(`[data-testid="message-bubble"]:has-text("${message}")`)).toBeVisible();
      await expect(page.locator('[data-testid="message-status"]:has-text("Queued")')).toBeVisible();
    }

    // Go back online
    await page.context().setOffline(false);

    // Wait for messages to sync
    await page.waitForTimeout(10000);

    // Verify all messages are sent
    for (const message of offlineMessages) {
      await expect(page.locator(`[data-testid="message-bubble"]:has-text("${message}")`)).toBeVisible();
      await expect(page.locator('[data-testid="message-status"]:has-text("✓")')).toBeVisible();
    }
  });

  test('performance with large message history', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await navigateToMessaging(page);

    // Measure initial load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="message-list"]');
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (< 2 seconds)
    expect(loadTime).toBeLessThan(2000);

    // Test virtual scrolling performance
    const messageList = page.locator('[data-testid="message-list"]');
    
    // Scroll to top rapidly
    await messageList.evaluate(el => {
      el.scrollTop = 0;
    });

    // Wait for pagination to load
    await page.waitForSelector('[data-testid="loading-more-messages"]', { timeout: 5000 });

    // Scroll to bottom rapidly
    await messageList.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });

    // Should handle rapid scrolling without performance issues
    await page.waitForTimeout(1000);
    
    // Verify UI is still responsive
    await expect(page.locator('[data-testid="message-input"]')).toBeEnabled();
  });

  test('error handling and recovery', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await navigateToMessaging(page);

    // Test server error handling
    await page.route('**/api/messaging/send', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Try to send a message
    await page.fill('[data-testid="message-input"]', 'This should trigger an error');
    await page.click('[data-testid="send-button"]');

    // Verify error is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test automatic retry with exponential backoff
    await page.unroute('**/api/messaging/send');
    
    // Should automatically retry and succeed
    await page.waitForTimeout(5000);
    await expect(page.locator('[data-testid="message-status"]:has-text("✓")')).toBeVisible();
  });
});

test.describe('Mobile Messaging Tests', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE size
  });

  test('mobile messaging interface', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await navigateToMessaging(page);

    // Verify mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-message-container"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="message-input"]');
    await expect(page.locator('[data-testid="message-input"]')).toBeFocused();

    // Test mobile keyboard behavior
    await page.fill('[data-testid="message-input"]', 'Mobile test message');
    await page.tap('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-bubble"]:has-text("Mobile test message")')).toBeVisible();
  });

  test('mobile conversation list swipe gestures', async ({ page }) => {
    await loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/chat');

    // Test swipe to delete/archive (if implemented)
    const conversationItem = page.locator('[data-testid="conversation-item"]:first-child');
    
    // Swipe left on conversation
    await conversationItem.hover();
    await page.mouse.down();
    await page.mouse.move(-100, 0);
    await page.mouse.up();

    // Verify swipe actions appear
    await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible();
  });
});