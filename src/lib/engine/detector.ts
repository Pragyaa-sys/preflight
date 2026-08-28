import fs from 'node:fs';
import path from 'node:path';
import {
  StackDetection,
  SupportedFramework,
  SupportedLanguage,
  PackageManager,
  ProjectType,
} from '@/types/project.types';

/**
 * Aggregates package.json data from root and top-level subfolders (client, server, frontend, backend, packages, apps)
 */
function aggregatePackageJsons(workspacePath: string): {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  packageJsonFound: boolean;
} {
  let name = path.basename(workspacePath);
  let packageJsonFound = false;
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const scripts: Record<string, string> = {};

  const potentialPkgDirs = [
    workspacePath,
    path.join(workspacePath, 'client'),
    path.join(workspacePath, 'server'),
    path.join(workspacePath, 'frontend'),
    path.join(workspacePath, 'backend'),
    path.join(workspacePath, 'web'),
    path.join(workspacePath, 'api'),
  ];

  // Also check packages/* and apps/* if monorepo
  for (const sub of ['packages', 'apps']) {
    const subPath = path.join(workspacePath, sub);
    if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
      try {
        const subEntries = fs.readdirSync(subPath);
        for (const entry of subEntries) {
          potentialPkgDirs.push(path.join(subPath, entry));
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  for (const dir of potentialPkgDirs) {
    const pkgFile = path.join(dir, 'package.json');
    if (fs.existsSync(pkgFile)) {
      try {
        const content = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
        packageJsonFound = true;
        if (dir === workspacePath && content.name) {
          name = content.name;
        }
        Object.assign(dependencies, content.dependencies || {});
        Object.assign(devDependencies, content.devDependencies || {});
        Object.assign(scripts, content.scripts || {});
      } catch {
        // Ignore invalid JSON in subpackages
      }
    }
  }

  return { name, dependencies, devDependencies, scripts, packageJsonFound };
}

export function detectStack(
  workspacePath: string,
  fileList: string[],
  totalFiles: number,
  ignoredFiles: number
): StackDetection {
  let language: SupportedLanguage = 'other';
  let packageManager: PackageManager = 'unknown';
  let hasTests = false;
  let hasTypeScript = false;
  let hasDocker = false;

  const { name, dependencies, devDependencies, scripts, packageJsonFound } =
    aggregatePackageJsons(workspacePath);

  const allDeps = { ...dependencies, ...devDependencies };
  const detectedFrameworksList: string[] = [];

  if (packageJsonFound) {
    language = 'javascript';
  }

  // 1. Language Detection & TypeScript
  if (
    fs.existsSync(path.join(workspacePath, 'tsconfig.json')) ||
    fileList.some((f) => f.endsWith('.ts') || f.endsWith('.tsx')) ||
    allDeps['typescript']
  ) {
    hasTypeScript = true;
    language = 'typescript';
  }

  if (language === 'other') {
    if (
      fs.existsSync(path.join(workspacePath, 'pyproject.toml')) ||
      fs.existsSync(path.join(workspacePath, 'requirements.txt')) ||
      fs.existsSync(path.join(workspacePath, 'Pipfile')) ||
      fileList.some((f) => f.endsWith('.py'))
    ) {
      language = 'python';
    } else if (
      fs.existsSync(path.join(workspacePath, 'go.mod')) ||
      fileList.some((f) => f.endsWith('.go'))
    ) {
      language = 'go';
    } else if (
      fs.existsSync(path.join(workspacePath, 'pom.xml')) ||
      fs.existsSync(path.join(workspacePath, 'build.gradle')) ||
      fileList.some((f) => f.endsWith('.java'))
    ) {
      language = 'java';
    } else if (
      fs.existsSync(path.join(workspacePath, 'Cargo.toml')) ||
      fileList.some((f) => f.endsWith('.rs'))
    ) {
      language = 'rust' as SupportedLanguage;
    } else if (fileList.some((f) => f.endsWith('.js') || f.endsWith('.jsx'))) {
      language = 'javascript';
    }
  }

  // 2. Granular Frontend Framework Detection
  let frontendFramework: string | undefined;
  if (allDeps['next']) {
    frontendFramework = 'nextjs';
    detectedFrameworksList.push('nextjs');
  } else if (allDeps['@remix-run/react'] || allDeps['@remix-run/node']) {
    frontendFramework = 'remix';
    detectedFrameworksList.push('remix');
  } else if (allDeps['astro']) {
    frontendFramework = 'astro';
    detectedFrameworksList.push('astro');
  } else if (allDeps['vite']) {
    if (allDeps['react'] || allDeps['@vitejs/plugin-react'] || allDeps['@vitejs/plugin-react-swc']) {
      frontendFramework = 'react-vite';
      detectedFrameworksList.push('react', 'vite');
    } else if (allDeps['vue'] || allDeps['@vitejs/plugin-vue']) {
      frontendFramework = 'vue-vite';
      detectedFrameworksList.push('vue', 'vite');
    } else if (allDeps['svelte'] || allDeps['@sveltejs/vite-plugin-svelte']) {
      frontendFramework = 'svelte-vite';
      detectedFrameworksList.push('svelte', 'vite');
    } else {
      frontendFramework = 'vite';
      detectedFrameworksList.push('vite');
    }
  } else if (allDeps['react']) {
    frontendFramework = 'react';
    detectedFrameworksList.push('react');
  } else if (allDeps['vue'] || allDeps['nuxt']) {
    frontendFramework = allDeps['nuxt'] ? 'nuxt' : 'vue';
    detectedFrameworksList.push(frontendFramework);
  } else if (allDeps['@sveltejs/kit'] || allDeps['svelte']) {
    frontendFramework = allDeps['@sveltejs/kit'] ? 'sveltekit' : 'svelte';
    detectedFrameworksList.push(frontendFramework);
  } else if (allDeps['@angular/core']) {
    frontendFramework = 'angular';
    detectedFrameworksList.push('angular');
  }

  // 3. Granular Backend Framework Detection
  let backendFramework: string | undefined;
  if (allDeps['@nestjs/core']) {
    backendFramework = 'nestjs';
    detectedFrameworksList.push('nestjs');
  } else if (allDeps['express']) {
    backendFramework = 'express';
    detectedFrameworksList.push('express');
  } else if (allDeps['fastify']) {
    backendFramework = 'fastify';
    detectedFrameworksList.push('fastify');
  } else if (allDeps['koa']) {
    backendFramework = 'koa';
    detectedFrameworksList.push('koa');
  } else if (allDeps['hono']) {
    backendFramework = 'hono';
    detectedFrameworksList.push('hono');
  }

  // Python backend frameworks
  if (language === 'python') {
    const reqPath = path.join(workspacePath, 'requirements.txt');
    const pyprojectPath = path.join(workspacePath, 'pyproject.toml');
    const reqText = (fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf-8') : '') +
      (fs.existsSync(pyprojectPath) ? fs.readFileSync(pyprojectPath, 'utf-8') : '');

    if (reqText.includes('fastapi') || fileList.some((f) => f.toLowerCase().includes('fastapi'))) {
      backendFramework = 'fastapi';
      detectedFrameworksList.push('fastapi');
    } else if (reqText.includes('django') || fileList.some((f) => f.toLowerCase().includes('django'))) {
      backendFramework = 'django';
      detectedFrameworksList.push('django');
    } else if (reqText.includes('flask') || fileList.some((f) => f.toLowerCase().includes('flask'))) {
      backendFramework = 'flask';
      detectedFrameworksList.push('flask');
    }
  }

  // Java / Go backend frameworks
  if (language === 'java') {
    if (fileList.some((f) => f.includes('SpringBoot')) || (fs.existsSync(path.join(workspacePath, 'pom.xml')) && fs.readFileSync(path.join(workspacePath, 'pom.xml'), 'utf-8').includes('spring-boot'))) {
      backendFramework = 'spring';
      detectedFrameworksList.push('spring-boot');
    }
  } else if (language === 'go') {
    const goModPath = path.join(workspacePath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      const goMod = fs.readFileSync(goModPath, 'utf-8');
      if (goMod.includes('gin-gonic/gin')) {
        backendFramework = 'gin';
        detectedFrameworksList.push('gin');
      } else if (goMod.includes('gofiber/fiber')) {
        backendFramework = 'fiber';
        detectedFrameworksList.push('fiber');
      } else if (goMod.includes('labstack/echo')) {
        backendFramework = 'echo';
        detectedFrameworksList.push('echo');
      }
    }
  }

  // 4. Secondary Tech & Tooling Detection (Tailwind, Prisma, Docker, etc.)
  if (allDeps['tailwindcss'] || allDeps['@tailwindcss/postcss'] || fileList.some((f) => f.includes('tailwind.config'))) {
    detectedFrameworksList.push('tailwind');
  }
  if (allDeps['prisma'] || allDeps['@prisma/client'] || fileList.some((f) => f.includes('schema.prisma'))) {
    detectedFrameworksList.push('prisma');
  }
  if (allDeps['drizzle-orm']) {
    detectedFrameworksList.push('drizzle');
  }
  if (allDeps['zustand']) {
    detectedFrameworksList.push('zustand');
  }

  // 5. Determine ProjectType & Primary Framework Representation
  let projectType: ProjectType = 'unknown';
  let framework: SupportedFramework = 'unknown';

  const isFullstack =
    (frontendFramework && backendFramework) ||
    frontendFramework === 'nextjs' ||
    frontendFramework === 'remix' ||
    frontendFramework === 'astro' ||
    frontendFramework === 'nuxt' ||
    frontendFramework === 'sveltekit';

  if (isFullstack) {
    projectType = 'fullstack';
    if (frontendFramework && backendFramework && frontendFramework !== backendFramework) {
      framework = `${frontendFramework} + ${backendFramework}`;
    } else {
      framework = (frontendFramework || backendFramework || 'fullstack') as SupportedFramework;
    }
  } else if (frontendFramework) {
    projectType = 'frontend';
    framework = frontendFramework as SupportedFramework;
  } else if (backendFramework) {
    projectType = 'backend';
    framework = backendFramework as SupportedFramework;
  } else if (packageJsonFound && !scripts['dev'] && !scripts['start'] && scripts['build']) {
    projectType = 'library';
  }

  // 6. Package Manager Detection
  if (fs.existsSync(path.join(workspacePath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(workspacePath, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (
    fs.existsSync(path.join(workspacePath, 'bun.lockb')) ||
    fs.existsSync(path.join(workspacePath, 'bun.lock'))
  ) {
    packageManager = 'bun';
  } else if (fs.existsSync(path.join(workspacePath, 'package-lock.json'))) {
    packageManager = 'npm';
  } else if (language === 'python') {
    packageManager = fs.existsSync(path.join(workspacePath, 'poetry.lock')) ? 'poetry' : 'pip';
  } else if (language === 'java') {
    packageManager = fs.existsSync(path.join(workspacePath, 'pom.xml')) ? 'maven' : 'gradle';
  } else if (language === 'rust') {
    packageManager = 'cargo';
  }

  // 7. Tests & Docker Detection
  if (
    scripts['test'] ||
    allDeps['jest'] ||
    allDeps['vitest'] ||
    allDeps['mocha'] ||
    allDeps['pytest'] ||
    fileList.some((f) => f.includes('.test.') || f.includes('.spec.') || f.includes('test_') || f.includes('__tests__'))
  ) {
    hasTests = true;
  }

  if (
    fs.existsSync(path.join(workspacePath, 'Dockerfile')) ||
    fs.existsSync(path.join(workspacePath, 'docker-compose.yml')) ||
    fs.existsSync(path.join(workspacePath, 'compose.yaml')) ||
    fileList.some((f) => f.toLowerCase().endsWith('dockerfile'))
  ) {
    hasDocker = true;
  }

  // 8. Suggested Checks
  const suggestedChecks: string[] = ['code-health', 'security'];
  if (scripts['build'] || scripts['test'] || scripts['lint'] || hasTypeScript) {
    suggestedChecks.push('build-test');
  }
  if (
    projectType === 'frontend' ||
    projectType === 'fullstack' ||
    scripts['dev'] ||
    scripts['start']
  ) {
    suggestedChecks.push('runtime-ui', 'performance');
  }

  // Ensure frameworks list has unique entries
  const uniqueFrameworks = Array.from(new Set(detectedFrameworksList));

  return {
    name,
    language,
    framework,
    frameworks: uniqueFrameworks,
    projectType,
    frontendFramework,
    backendFramework,
    packageManager,
    hasTests,
    hasTypeScript,
    hasDocker,
    totalFiles,
    analyzedFiles: fileList.length,
    ignoredFiles,
    suggestedChecks,
  };
}
