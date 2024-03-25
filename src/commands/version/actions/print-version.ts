import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const printVersion = () => {
  const pck_path = join(__dirname, `../../../../package.json`);
  const Package: { version: string } = existsSync(pck_path)
    ? JSON.parse(readFileSync(pck_path, "utf-8"))
    : null;

  console.log(Package.version);
};
