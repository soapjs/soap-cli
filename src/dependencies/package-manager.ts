import fs from "fs";
import path from "path";
import { PackageManager } from "../core/command-context";

export function detectPackageManager(root: string, override?: PackageManager): PackageManager {
  if (override) {
    return override;
  }

  const lockfiles: Array<[string, PackageManager]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ];

  for (const [lockfile, packageManager] of lockfiles) {
    if (fs.existsSync(path.join(root, lockfile))) {
      return packageManager;
    }
  }

  return "npm";
}

export function installCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn install";
    case "bun":
      return "bun install";
    case "npm":
    default:
      return "npm install";
  }
}

export function installCommandParts(packageManager: PackageManager): { command: string; args: string[] } {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: ["install"] };
    case "bun":
      return { command: "bun", args: ["install"] };
    case "npm":
    default:
      return { command: "npm", args: ["install"] };
  }
}
