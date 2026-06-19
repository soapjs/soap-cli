import fs from "fs/promises";
import path from "path";
import { CliError } from "../core/errors";
import { findSoapRoot } from "./find-soap-root";
import {
  validateApiConfig,
  validateProjectConfig,
  validateRegistryConfig,
  validateStructureConfig,
} from "./schemas/validation";
import { SoapConfig } from "./schemas/types";

async function readJson(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

export async function loadSoapConfig(cwd: string): Promise<SoapConfig> {
  const root = findSoapRoot(cwd);

  if (!root) {
    throw new CliError("This command must be run inside a SoapJS project. Run `soap create <name>` first.");
  }

  const soapRoot = path.join(root, ".soap");

  return {
    root,
    project: validateProjectConfig(await readJson(path.join(soapRoot, "project.json"))),
    structure: validateStructureConfig(await readJson(path.join(soapRoot, "structure.json"))),
    api: validateApiConfig(await readJson(path.join(soapRoot, "api.json"))),
    registry: validateRegistryConfig(await readJson(path.join(soapRoot, "registry.json"))),
  };
}
