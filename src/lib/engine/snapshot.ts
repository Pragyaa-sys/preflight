import fs from 'node:fs';
import path from 'node:path';
import { ProjectSnapshot, FileSnapshot } from '@/types/project.types';
import { ExtractedWorkspace } from './extract';
import { detectStack } from './detector';

export function createProjectSnapshot(workspace: ExtractedWorkspace): ProjectSnapshot {
  const { projectId, workspacePath, fileList, totalFiles, ignoredFiles } = workspace;

  const stack = detectStack(workspacePath, fileList, totalFiles, ignoredFiles);

  const files: FileSnapshot[] = fileList.map((relPath) => {
    const fullPath = path.join(workspacePath, relPath);
    let size = 0;
    try {
      size = fs.statSync(fullPath).size;
    } catch {
      // Ignore file stat failure
    }

    const ext = path.extname(relPath).toLowerCase();
    const filename = path.basename(relPath).toLowerCase();

    const isTestFile =
      relPath.includes('.test.') ||
      relPath.includes('.spec.') ||
      filename.startsWith('test_') ||
      relPath.includes('__tests__');

    const isConfigFile =
      filename.includes('config') ||
      filename.startsWith('.') ||
      ['package.json', 'tsconfig.json', 'pyproject.toml', 'go.mod'].includes(filename);

    return {
      path: fullPath,
      relativePath: relPath,
      size,
      extension: ext,
      isTestFile,
      isConfigFile,
    };
  });

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

  for (const dir of potentialPkgDirs) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        Object.assign(dependencies, pkg.dependencies || {});
        Object.assign(devDependencies, pkg.devDependencies || {});
        Object.assign(scripts, pkg.scripts || {});
      } catch {
        // Ignore JSON parse error
      }
    }
  }

  return {
    id: projectId,
    uploadedAt: new Date().toISOString(),
    name: stack.name,
    stack,
    files,
    dependencies,
    devDependencies,
    scripts,
  };
}
