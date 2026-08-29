import assert from 'assert';
import path from 'path';
import { runProcess } from '../src/lib/engine/process-runner';
import { runBuildTestCheck } from '../src/lib/checks/build-test';
import { runRuntimeUICheck } from '../src/lib/checks/runtime-ui';
import { runPerformanceCheck } from '../src/lib/checks/performance';
import { ProjectSnapshot } from '../src/types/project.types';

async function testProcessRunner() {
  console.log('Testing Process Runner...');
  const res = await runProcess({
    cwd: process.cwd(),
    command: 'node',
    args: ['-e', 'console.log("hello world")'],
    timeoutMs: 5000,
  });

  assert.strictEqual(res.failed, false, 'Process should succeed');
  assert.strictEqual(res.exitCode, 0, 'Exit code should be 0');
  assert.ok(res.stdout.includes('hello world'), 'Stdout should include printed text');
  console.log('✔ Process Runner passed');
}

async function testBuildTestCheck() {
  console.log('Testing Build & Test Check...');
  const dummySnapshot: ProjectSnapshot = {
    id: 'test-project',
    uploadedAt: new Date().toISOString(),
    name: 'Sample Test App',
    stack: {
      name: 'Sample App',
      language: 'typescript',
      framework: 'nextjs',
      frameworks: ['nextjs'],
      projectType: 'fullstack',
      packageManager: 'npm',
      hasTests: false,
      hasTypeScript: true,
      hasDocker: false,
      totalFiles: 1,
      analyzedFiles: 1,
      ignoredFiles: 0,
      suggestedChecks: [],
    },
    files: [
      {
        path: path.join(process.cwd(), 'package.json'),
        relativePath: 'package.json',
        size: 100,
        extension: '.json',
        isTestFile: false,
        isConfigFile: true,
      },
    ],
    dependencies: {},
    devDependencies: {},
    scripts: {
      typecheck: 'node -e "console.log(1)"',
    },
  };

  const result = await runBuildTestCheck(dummySnapshot);
  if (result.findings.length > 0) {
    console.error('Unexpected findings:', result.findings);
  }
  assert.strictEqual(result.category, 'build-test');
  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(result.findings.length, 0, 'No findings for succeeding typecheck');
  console.log('✔ Build & Test Check passed');
}

async function testRuntimeAndPerformanceMock() {
  console.log('Testing Runtime/UI and Performance Check with mock audit results...');
  const dummySnapshot: ProjectSnapshot = {
    id: 'test-project',
    uploadedAt: new Date().toISOString(),
    name: 'Sample Test App',
    stack: {
      name: 'Sample App',
      language: 'typescript',
      framework: 'nextjs',
      frameworks: ['nextjs'],
      projectType: 'fullstack',
      packageManager: 'npm',
      hasTests: false,
      hasTypeScript: true,
      hasDocker: false,
      totalFiles: 1,
      analyzedFiles: 1,
      ignoredFiles: 0,
      suggestedChecks: [],
    },
    files: [
      {
        path: path.join(process.cwd(), 'package.json'),
        relativePath: 'package.json',
        size: 100,
        extension: '.json',
        isTestFile: false,
        isConfigFile: true,
      },
    ],
    dependencies: {},
    devDependencies: {},
    scripts: {
      dev: 'next dev',
    },
  };

  const mockAuditResult = {
    baseUrl: 'http://localhost:3000',
    port: 3000,
    serverStarted: true,
    crawlResults: [
      {
        route: '/',
        url: 'http://localhost:3000/',
        statusCode: 200,
        consoleErrors: [{ type: 'error', text: 'Uncaught ReferenceError: foo is not defined' }],
        networkFailures: [{ url: 'http://localhost:3000/api/missing', status: 404, errorText: 'Not Found' }],
        accessibilityViolations: [
          {
            id: 'image-alt',
            impact: 'serious',
            help: 'Images must have alternate text',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
            nodesCount: 2,
            targetSnippet: '<img src="/test.png">',
          },
        ],
        navigationTiming: {
          ttfb: 950,
          domContentLoaded: 3200,
          loadTime: 3500,
        },
        largeAssets: [{ url: 'http://localhost:3000/huge.js', sizeBytes: 2000000 }],
      },
    ],
    serverLogs: [],
  };

  const runtimeRes = await runRuntimeUICheck(dummySnapshot, mockAuditResult);
  assert.strictEqual(runtimeRes.category, 'runtime-ui');
  assert.strictEqual(runtimeRes.findings.length, 3, 'Should find console err, net fail, and a11y violation');

  const perfRes = await runPerformanceCheck(dummySnapshot, mockAuditResult);
  assert.strictEqual(perfRes.category, 'performance');
  assert.strictEqual(perfRes.findings.length, 3, 'Should find slow TTFB, slow DOM, and large asset');

  console.log('✔ Runtime/UI and Performance Checks passed');
}

async function runAllTests() {
  try {
    await testProcessRunner();
    await testBuildTestCheck();
    await testRuntimeAndPerformanceMock();
    console.log('\n✅ All Member 2 test scripts executed successfully!');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

runAllTests();
