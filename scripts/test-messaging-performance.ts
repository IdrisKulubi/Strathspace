#!/usr/bin/env tsx

/**
 * Comprehensive messaging performance test runner
 * Runs all messaging-related tests and generates performance reports
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  metrics?: Record<string, any>;
}

interface PerformanceReport {
  timestamp: string;
  totalDuration: number;
  testResults: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    slowestTest: string;
    fastestTest: string;
  };
}

class PerformanceTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<PerformanceReport> {
    console.log('🚀 Starting comprehensive messaging performance tests...\n');
    this.startTime = Date.now();

    // Run unit tests
    await this.runTest('Unit Tests - Message Cache', () => 
      this.runCommand('npm run test -- --testPathPattern=cache.test.ts --verbose')
    );

    await this.runTest('Unit Tests - Performance Monitoring', () => 
      this.runCommand('npm run test -- --testPathPattern=performance.test.ts --verbose')
    );

    await this.runTest('Unit Tests - Messaging Actions', () => 
      this.runCommand('npm run test -- --testPathPattern=messaging.actions.test.ts --verbose')
    );

    await this.runTest('Unit Tests - Messaging Components', () => 
      this.runCommand('npm run test -- --testPathPattern=messaging/__tests__ --verbose')
    );

    // Run E2E tests
    await this.runTest('E2E Tests - Messaging Workflow', () => 
      this.runCommand('npx playwright test tests/e2e/messaging-workflow.spec.ts --reporter=json')
    );

    // Run performance tests
    await this.runTest('Performance Tests - Message Loading', () => 
      this.runCommand('npx playwright test tests/performance/messaging-performance.spec.ts --reporter=json')
    );

    // Generate report
    const report = this.generateReport();
    this.saveReport(report);
    this.printSummary(report);

    return report;
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`📋 Running: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        duration,
        success: true,
        metrics: this.extractMetrics(result)
      });
      
      console.log(`✅ ${name} - ${duration}ms\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.log(`❌ ${name} - Failed after ${duration}ms`);
      console.log(`   Error: ${error}\n`);
    }
  }

  private async runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const output = execSync(command, { 
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 300000 // 5 minutes timeout
        });
        resolve(output);
      } catch (error) {
        reject(error);
      }
    });
  }

  private extractMetrics(output: string): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    try {
      // Try to parse Jest output for test metrics
      const jestMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (jestMatch) {
        metrics.testsRun = parseInt(jestMatch[2]);
        metrics.testsPassed = parseInt(jestMatch[1]);
      }

      // Try to parse Playwright output for performance metrics
      const playwrightMatch = output.match(/"duration":\s*(\d+)/g);
      if (playwrightMatch) {
        const durations = playwrightMatch.map(match => 
          parseInt(match.match(/(\d+)/)![1])
        );
        metrics.testDurations = durations;
        metrics.averageTestDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      }

      // Extract coverage information
      const coverageMatch = output.match(/All files[^|]*\|\s*([0-9.]+)/);
      if (coverageMatch) {
        metrics.coverage = parseFloat(coverageMatch[1]);
      }

    } catch (error) {
      console.warn('Failed to extract metrics from output:', error);
    }

    return metrics;
  }

  private generateReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    const durations = this.results.map(r => r.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    const slowestTest = this.results.reduce((prev, current) => 
      prev.duration > current.duration ? prev : current
    );
    
    const fastestTest = this.results.reduce((prev, current) => 
      prev.duration < current.duration ? prev : current
    );

    return {
      timestamp: new Date().toISOString(),
      totalDuration,
      testResults: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: passedTests.length,
        failedTests: failedTests.length,
        averageDuration,
        slowestTest: slowestTest.name,
        fastestTest: fastestTest.name
      }
    };
  }

  private saveReport(report: PerformanceReport): void {
    try {
      // Create reports directory if it doesn't exist
      const reportsDir = join(process.cwd(), 'reports');
      mkdirSync(reportsDir, { recursive: true });

      // Save detailed JSON report
      const jsonPath = join(reportsDir, `messaging-performance-${Date.now()}.json`);
      writeFileSync(jsonPath, JSON.stringify(report, null, 2));

      // Save summary report
      const summaryPath = join(reportsDir, 'messaging-performance-latest.json');
      writeFileSync(summaryPath, JSON.stringify(report, null, 2));

      console.log(`📊 Performance report saved to: ${jsonPath}`);
    } catch (error) {
      console.error('Failed to save performance report:', error);
    }
  }

  private printSummary(report: PerformanceReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MESSAGING PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Total Duration: ${report.totalDuration}ms`);
    console.log(`📋 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passedTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    console.log(`📈 Average Test Duration: ${Math.round(report.summary.averageDuration)}ms`);
    console.log(`🐌 Slowest Test: ${report.summary.slowestTest}`);
    console.log(`⚡ Fastest Test: ${report.summary.fastestTest}`);
    
    if (report.summary.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.testResults
        .filter(r => !r.success)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    // Performance recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
    
    if (report.summary.averageDuration > 5000) {
      console.log('   • Consider optimizing slow tests (average > 5s)');
    }
    
    const slowTests = report.testResults.filter(r => r.duration > 10000);
    if (slowTests.length > 0) {
      console.log('   • Review tests taking longer than 10s:');
      slowTests.forEach(test => {
        console.log(`     - ${test.name}: ${test.duration}ms`);
      });
    }

    if (report.summary.failedTests === 0) {
      console.log('   🎉 All tests passed! Great job!');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  
  runner.runAllTests()
    .then(() => {
      console.log('✅ Performance testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    });
}

export { PerformanceTestRunner };