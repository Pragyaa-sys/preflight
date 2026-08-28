export type SupportedLanguage = "typescript" | "javascript" | "python" | "go" | "java" | "other";

export type SupportedFramework =
  | "nextjs"
  | "react-vite"
  | "express"
  | "fastapi"
  | "spring"
  | "unknown";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "pip" | "maven" | "gradle" | "unknown";

export interface StackDetection {
  name: string;
  language: SupportedLanguage;
  framework: SupportedFramework;
  packageManager: PackageManager;
  hasTests: boolean;
  hasTypeScript: boolean;
  hasDocker: boolean;
  totalFiles: number;
  analyzedFiles: number;
  ignoredFiles: number;
  suggestedChecks: string[];
}

export interface FileSnapshot {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  isTestFile: boolean;
  isConfigFile: boolean;
}

export interface ProjectSnapshot {
  id: string;
  uploadedAt: string;
  name: string;
  stack: StackDetection;
  files: FileSnapshot[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}
