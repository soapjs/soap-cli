import { dirname } from "path";
import { existsSync, mkdirSync } from "fs";

export const ensurePathExists = (path: string) => {
  const targetDirPath = dirname(path);
  if (!existsSync(targetDirPath)) {
    mkdirSync(targetDirPath, { recursive: true });
  }
};

export const fileOrDirExists = (fileOrDir: string) => {
  return fileOrDir ? existsSync(fileOrDir) : false;
};
