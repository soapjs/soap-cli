import fs from "fs";
import path from "path";

export function findSoapRoot(cwd: string): string | undefined {
  let current = path.resolve(cwd);

  while (true) {
    if (fs.existsSync(path.join(current, ".soap", "project.json"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}
