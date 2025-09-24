#!/usr/bin/env tsx

/**
 * Messaging System Migration Verification Script
 * Verifies that the old messaging system has been completely replaced with the new optimized system
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface MigrationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class MigrationVerifier {
  private checks: MigrationCheck[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runAllChecks(): Promise<void> {
    console.log('🔍 Verifying Messaging System Migration...\n');

    // Check 1: Verify old components are removed/replaced
    this.checkOldComponentsRemoved();

    // Check 2: Verify new components are in use
    this.checkNewComponentsInUse();

    // Check 3: Verify environment configuration
    this.checkEnvironmentConfig();

    // Check 4: Verify new hooks are being used
    this.checkNewHooksUsage();

    // Check 5: Verify performance monitoring is enabled
    this.checkPerformanceMonitoring();

    // Check 6: Verify caching system is integrated
    this.checkCachingSystem();

    // Check 7: Verify offline support is enabled
    this.checkOfflineSupport();

    // Print results
    this.printResults();
  }

  private checkOldComponentsRemoved(): void {
    const oldImports = [
      'useChat',
      'ChatHeader',
      'ChatInput',
      'chat.actions'
    ];

    let foundOldImports = false;
    const foundFiles: string[] = [];

    oldImports.forEach(importName => {
      try {
        const result = execSync(`grep -r "${importName}" src/ --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
        if (result.trim()) {
          foundOldImports = true;
          foundFiles.push(`${importName}: ${result.split('\n')[0]}`);
        }
      } catch (error) {
        // Ignore grep errors
      }
    });

    this.checks.push({
      name: 'Old Components Removed',
      status: foundOldImports ? 'fail' : 'pass',
      message: foundOldImports 
        ? 'Found references to old messaging components'
        : 'All old messaging components have been removed',
      details: foundOldImports ? foundFiles.join('\n') : undefined
    });
  }

  private checkNewComponentsInUse(): void {
    const newImports = [
      'MessagingContainer',
      'useCachedMessaging',
      'VirtualMessageList',
      'MessageInput'
    ];

    let foundNewImports = 0;
    const foundFiles: string[] = [];

    newImports.forEach(importName => {
      try {
        const result = execSync(`grep -r "${importName}" src/ --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
        if (result.trim()) {
          foundNewImports++;
          foundFiles.push(`${importName}: Found`);
        }
      } catch (error) {
        // Ignore grep errors
      }
    });

    this.checks.push({
      name: 'New Components In Use',
      status: foundNewImports >= 2 ? 'pass' : 'warning',
      message: `Found ${foundNewImports}/${newImports.length} new messaging components in use`,
      details: foundFiles.join('\n')
    });
  }

  private checkEnvironmentConfig(): void {
    const envPath = join(this.projectRoot, '.env.local');
    
    if (!existsSync(envPath)) {
      this.checks.push({
        name: 'Environment Configuration',
        status: 'fail',
        message: '.env.local file not found'
      });
      return;
    }

    const envContent = readFileSync(envPath, 'utf8');
    
    const pusherDisabled = envContent.includes('# NEXT_PUBLIC_PUSHER_KEY') || 
                          !envContent.includes('NEXT_PUBLIC_PUSHER_KEY=');
    const newSystemEnabled = envContent.includes('NEXT_PUBLIC_MESSAGING_SYSTEM="optimized"');
    const performanceEnabled = envContent.includes('NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING="true"');

    let status: 'pass' | 'fail' | 'warning' = 'pass';
    let message = 'Environment properly configured for new messaging system';

    if (!pusherDisabled) {
      status = 'warning';
      message = 'Pusher configuration still active - should be commented out';
    }

    if (!newSystemEnabled || !performanceEnabled) {
      status = 'warning';
      message = 'New messaging system flags not fully configured';
    }

    this.checks.push({
      name: 'Environment Configuration',
      status,
      message,
      details: `Pusher disabled: ${pusherDisabled}, New system: ${newSystemEnabled}, Performance: ${performanceEnabled}`
    });
  }

  private checkNewHooksUsage(): void {
    try {
      const result = execSync(`grep -r "useCachedMessaging" src/ --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
      const usageCount = result.split('\n').filter(line => line.trim()).length;

      this.checks.push({
        name: 'New Hooks Usage',
        status: usageCount > 0 ? 'pass' : 'fail',
        message: usageCount > 0 
          ? `useCachedMessaging hook found in ${usageCount} locations`
          : 'useCachedMessaging hook not found - old hooks may still be in use'
      });
    } catch (error) {
      this.checks.push({
        name: 'New Hooks Usage',
        status: 'fail',
        message: 'Error checking hook usage'
      });
    }
  }

  private checkPerformanceMonitoring(): void {
    try {
      const result = execSync(`grep -r "performanceMonitor" src/ --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
      const usageCount = result.split('\n').filter(line => line.trim()).length;

      this.checks.push({
        name: 'Performance Monitoring',
        status: usageCount > 0 ? 'pass' : 'warning',
        message: usageCount > 0 
          ? `Performance monitoring found in ${usageCount} locations`
          : 'Performance monitoring not detected'
      });
    } catch (error) {
      this.checks.push({
        name: 'Performance Monitoring',
        status: 'warning',
        message: 'Could not verify performance monitoring integration'
      });
    }
  }

  private checkCachingSystem(): void {
    try {
      const result = execSync(`grep -r "messageCache" src/ --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
      const usageCount = result.split('\n').filter(line => line.trim()).length;

      this.checks.push({
        name: 'Message Caching System',
        status: usageCount > 0 ? 'pass' : 'warning',
        message: usageCount > 0 
          ? `Message caching found in ${usageCount} locations`
          : 'Message caching system not detected'
      });
    } catch (error) {
      this.checks.push({
        name: 'Message Caching System',
        status: 'warning',
        message: 'Could not verify caching system integration'
      });
    }
  }

  private checkOfflineSupport(): void {
    try {
      const result = execSync(`grep -r "isOnline\\|offline" src/ --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
      const usageCount = result.split('\n').filter(line => line.trim()).length;

      this.checks.push({
        name: 'Offline Support',
        status: usageCount > 0 ? 'pass' : 'warning',
        message: usageCount > 0 
          ? `Offline support indicators found in ${usageCount} locations`
          : 'Offline support not detected'
      });
    } catch (error) {
      this.checks.push({
        name: 'Offline Support',
        status: 'warning',
        message: 'Could not verify offline support integration'
      });
    }
  }

  private printResults(): void {
    console.log('📊 MIGRATION VERIFICATION RESULTS');
    console.log('='.repeat(50));

    const passed = this.checks.filter(c => c.status === 'pass').length;
    const warnings = this.checks.filter(c => c.status === 'warning').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;

    this.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
      
      if (check.details) {
        console.log(`   Details: ${check.details}`);
      }
      console.log();
    });

    console.log('='.repeat(50));
    console.log(`📈 SUMMARY: ${passed} passed, ${warnings} warnings, ${failed} failed`);

    if (failed === 0 && warnings <= 2) {
      console.log('🎉 MIGRATION SUCCESSFUL! New messaging system is properly integrated.');
    } else if (failed === 0) {
      console.log('✅ MIGRATION MOSTLY COMPLETE. Review warnings above.');
    } else {
      console.log('❌ MIGRATION INCOMPLETE. Please address failed checks.');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Test the messaging functionality in development');
    console.log('2. Run performance tests: npm run test:performance');
    console.log('3. Verify E2E tests: npm run test:e2e');
    console.log('4. Monitor performance in production');
  }
}

// Run verification if script is executed directly
if (require.main === module) {
  const verifier = new MigrationVerifier();
  verifier.runAllChecks()
    .then(() => {
      console.log('\n✅ Migration verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration verification failed:', error);
      process.exit(1);
    });
}

export { MigrationVerifier };