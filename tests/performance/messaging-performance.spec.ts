import { test, expect, type Page } from '@playwright/test';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  messageLoad: 2000, // 2 seconds max for initial message load
  messageSend: 1000, // 1 second max for message send
  pagination: 1500, // 1.5 seconds max for pagination load
  virtualScroll: 100, // 100ms max for virtual scroll updates
  conversationSwitch: 800, // 800ms max to switch conversations
};

// Test data generators
function generateLargeMessage(size: number = 500): string {
  return 'A'.repeat(size) + ' - Performance test message';
}

function generateMessageBatch(count: number): string[] {
  return Array.from({ length: count }, (_, i) => 
    `Performance test message ${i + 1} - ${generateLargeMessage(100)}`
  );
}

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/auth/signin');
  await page.fill('[data-testid="email-input"]', 'perf.test@strathmore.edu');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  await page.click('[data-testid="signin-button"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function navigateToMessaging(page: Page, matchId?: string) {
  const startTime = Date.now();
  
  if (matchId) {
    await page.goto(`/chat/${matchId}`);
  } else {
    await page.goto('/chat');
    await page.click('[data-testid="conversation-item"]:first-child');
  }
  
  await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });
  
  return Date.now() - startTime;
}

async function measureMessageSend(page: Page, message: string): Promise<number> {
  const startTime = Date.now();
  
  await page.fill('[data-testid="message-input"]', message);
  await page.click('[data-testid="send-button"]');
  
  // Wait for message to appear with sent status
  await page.waitForSelector(`[data-testid="message-bubble"]:has-text("${message}")`, {
    timeout: 5000
  });
  await page.waitForSelector('[data-testid="message-status"]:has-text("✓")', {
    timeout: 5000
  });
  
  return Date.now() - startTime;
}

async function measurePagination(page: Page): Promise<number> {
  const startTime = Date.now();
  
  // Scroll to top to trigger pagination
  await page.locator('[data-testid="message-list"]').evaluate(el => {
    el.scrollTop = 0;
  });
  
  // Wait for loading indicator
  await page.waitForSelector('[data-testid="loading-more-messages"]', { timeout: 5000 });
  
  // Wait for loading to complete
  await page.waitForSelector('[data-testid="loading-more-messages"]', { 
    state: 'hidden',
    timeout: 10000 
  });
  
  return Date.now() - startTime;
}

async function measureVirtualScrollPerformance(page: Page): Promise<{
  scrollTime: number;
  renderTime: number;
  memoryUsage?: number;
}> {
  const startTime = Date.now();
  
  // Rapid scroll test
  const messageList = page.locator('[data-testid="message-list"]');
  
  // Scroll to bottom
  await messageList.evaluate(el => {
    el.scrollTop = el.scrollHeight;
  });
  
  const scrollTime = Date.now() - startTime;
  
  // Measure render time
  const renderStartTime = Date.now();
  await page.waitForTimeout(100); // Allow for render
  const renderTime = Date.now() - renderStartTime;
  
  // Measure memory usage (if available)
  let memoryUsage;
  try {
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });
    memoryUsage = metrics;
  } catch (error) {
    // Memory API not available
  }
  
  return { scrollTime, renderTime, memoryUsage };
}

test.describe('Messaging Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('message loading performance', async ({ page }) => {
    // Test initial message load performance
    const loadTime = await navigateToMessaging(page);
    
    console.log(`Message load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageLoad);
    
    // Verify messages are visible
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-bubble"]')).toHaveCount.greaterThan(0);
  });

  test('message sending performance', async ({ page }) => {
    await navigateToMessaging(page);
    
    // Test single message send performance
    const message = 'Performance test message';
    const sendTime = await measureMessageSend(page, message);
    
    console.log(`Message send time: ${sendTime}ms`);
    expect(sendTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageSend);
  });

  test('batch message sending performance', async ({ page }) => {
    await navigateToMessaging(page);
    
    const messages = generateMessageBatch(10);
    const sendTimes: number[] = [];
    
    // Send messages in sequence and measure each
    for (const message of messages) {
      const sendTime = await measureMessageSend(page, message);
      sendTimes.push(sendTime);
      
      // Small delay between messages
      await page.waitForTimeout(100);
    }
    
    const averageSendTime = sendTimes.reduce((a, b) => a + b, 0) / sendTimes.length;
    const maxSendTime = Math.max(...sendTimes);
    
    console.log(`Average send time: ${averageSendTime}ms`);
    console.log(`Max send time: ${maxSendTime}ms`);
    
    // Average should be within threshold
    expect(averageSendTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageSend);
    
    // No single message should take more than 2x the threshold
    expect(maxSendTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageSend * 2);
  });

  test('message pagination performance', async ({ page }) => {
    await navigateToMessaging(page);
    
    // Ensure we have enough messages for pagination
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 5000 });
    
    const paginationTime = await measurePagination(page);
    
    console.log(`Pagination load time: ${paginationTime}ms`);
    expect(paginationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pagination);
    
    // Verify older messages are loaded
    const messageCount = await page.locator('[data-testid="message-bubble"]').count();
    expect(messageCount).toBeGreaterThan(10); // Should have loaded more messages
  });

  test('virtual scrolling performance', async ({ page }) => {
    await navigateToMessaging(page);
    
    // Wait for messages to load
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 5000 });
    
    const performance = await measureVirtualScrollPerformance(page);
    
    console.log(`Virtual scroll performance:`, performance);
    
    expect(performance.scrollTime).toBeLessThan(PERFORMANCE_THRESHOLDS.virtualScroll);
    expect(performance.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.virtualScroll);
    
    // Memory usage should be reasonable (if available)
    if (performance.memoryUsage) {
      expect(performance.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB max
    }
  });

  test('conversation switching performance', async ({ page }) => {
    await page.goto('/chat');
    
    // Wait for conversation list to load
    await page.waitForSelector('[data-testid="conversation-item"]', { timeout: 5000 });
    
    const conversationCount = await page.locator('[data-testid="conversation-item"]').count();
    
    if (conversationCount < 2) {
      test.skip('Need at least 2 conversations for switching test');
    }
    
    // Measure switching between conversations
    const switchTimes: number[] = [];
    
    for (let i = 0; i < Math.min(3, conversationCount); i++) {
      const startTime = Date.now();
      
      await page.click(`[data-testid="conversation-item"]:nth-child(${i + 1})`);
      await page.waitForSelector('[data-testid="message-input"]', { timeout: 5000 });
      await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 5000 });
      
      const switchTime = Date.now() - startTime;
      switchTimes.push(switchTime);
      
      console.log(`Conversation switch ${i + 1} time: ${switchTime}ms`);
      
      // Go back to conversation list
      await page.goBack();
      await page.waitForSelector('[data-testid="conversation-list"]', { timeout: 5000 });
    }
    
    const averageSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    expect(averageSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.conversationSwitch);
  });

  test('large message handling performance', async ({ page }) => {
    await navigateToMessaging(page);
    
    // Test sending large messages
    const largeSizes = [1000, 2000, 5000]; // Character counts
    
    for (const size of largeSizes) {
      const largeMessage = generateLargeMessage(size);
      const sendTime = await measureMessageSend(page, largeMessage);
      
      console.log(`Large message (${size} chars) send time: ${sendTime}ms`);
      
      // Large messages may take longer but should still be reasonable
      expect(sendTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageSend * 2);
      
      // Verify message is displayed correctly
      await expect(page.locator(`[data-testid="message-bubble"]:has-text("${largeMessage.substring(0, 50)}")`)).toBeVisible();
    }
  });

  test('concurrent user simulation performance', async ({ browser }) => {
    // Simulate multiple users sending messages concurrently
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    try {
      // Login all users
      await Promise.all(pages.map(page => loginUser(page)));
      
      // Navigate all to same conversation
      await Promise.all(pages.map(page => navigateToMessaging(page)));
      
      // Send messages concurrently
      const startTime = Date.now();
      
      const sendPromises = pages.map((page, index) => 
        measureMessageSend(page, `Concurrent message from user ${index + 1}`)
      );
      
      const sendTimes = await Promise.all(sendPromises);
      const totalTime = Date.now() - startTime;
      
      console.log(`Concurrent send times:`, sendTimes);
      console.log(`Total concurrent operation time: ${totalTime}ms`);
      
      // All messages should send within reasonable time
      sendTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.messageSend * 2);
      });
      
      // Total time should be reasonable (not much longer than single send)
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageSend * 3);
      
    } finally {
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
  });

  test('memory leak detection', async ({ page }) => {
    await navigateToMessaging(page);
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Perform memory-intensive operations
    for (let i = 0; i < 50; i++) {
      await measureMessageSend(page, `Memory test message ${i}`);
      
      // Scroll around to trigger virtual list updates
      await page.locator('[data-testid="message-list"]').evaluate(el => {
        el.scrollTop = Math.random() * el.scrollHeight;
      });
      
      await page.waitForTimeout(50);
    }
    
    // Force garbage collection (if available)
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);
      
      // Memory increase should be reasonable (less than 100% increase)
      expect(memoryIncreasePercent).toBeLessThan(100);
    }
  });

  test('network condition performance', async ({ page }) => {
    // Test performance under different network conditions
    const networkConditions = [
      { name: 'Fast 3G', downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 40 },
      { name: 'Slow 3G', downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 },
    ];
    
    for (const condition of networkConditions) {
      console.log(`Testing under ${condition.name} conditions`);
      
      // Simulate network conditions
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: condition.downloadThroughput,
        uploadThroughput: condition.uploadThroughput,
        latency: condition.latency,
      });
      
      await navigateToMessaging(page);
      
      // Test message sending under these conditions
      const sendTime = await measureMessageSend(page, `Message under ${condition.name}`);
      
      console.log(`Send time under ${condition.name}: ${sendTime}ms`);
      
      // Adjust thresholds based on network conditions
      const adjustedThreshold = condition.name === 'Slow 3G' 
        ? PERFORMANCE_THRESHOLDS.messageSend * 3 
        : PERFORMANCE_THRESHOLDS.messageSend * 1.5;
      
      expect(sendTime).toBeLessThan(adjustedThreshold);
      
      // Disable network emulation
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
    }
  });
});