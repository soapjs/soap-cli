import fs from "fs/promises";
import path from "path";
import { CommandContext } from "../core/command-context";
import { SoapApiConfig, SoapProjectConfig, SoapRegistryConfig, SoapStructureConfig } from "./schemas/types";

async function writeJson(filePath: string, value: unknown, context: CommandContext): Promise<void> {
  const content = `${JSON.stringify(value, null, 2)}\n`;

  if (context.dryRun) {
    context.output.info(`[dry-run] write ${filePath}`);
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function writeSoapConfig(
  root: string,
  config: {
    project: SoapProjectConfig;
    structure: SoapStructureConfig;
    api: SoapApiConfig;
    registry: SoapRegistryConfig;
  },
  context: CommandContext
): Promise<void> {
  const soapRoot = path.join(root, ".soap");

  await writeJson(path.join(soapRoot, "project.json"), config.project, context);
  await writeJson(path.join(soapRoot, "structure.json"), config.structure, context);
  await writeJson(path.join(soapRoot, "api.json"), config.api, context);
  await writeJson(path.join(soapRoot, "registry.json"), config.registry, context);
}
