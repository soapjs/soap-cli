import { Command } from "commander";
import fs from "fs";
import path from "path";
import { getCommandContext } from "../../core/command-context";
import { findSoapRoot } from "../../config/find-soap-root";
import { loadSoapConfig } from "../../config/load-soap-config";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Validate local SoapJS CLI/project setup.")
    .action(async (_options: unknown, command: Command) => {
      const context = getCommandContext(command);
      const soapRoot = findSoapRoot(context.cwd);

      context.output.info(`Node.js: ${process.version}`);

      if (!soapRoot) {
        context.output.warn("No .soap project found from current directory.");
        return;
      }

      const config = await loadSoapConfig(context.cwd);
      context.output.success(`Found SoapJS project: ${config.project.name}`);

      const requiredFiles = [".soap/project.json", ".soap/structure.json", ".soap/api.json", ".soap/registry.json"];
      for (const file of requiredFiles) {
        const absolute = path.join(soapRoot, file);
        if (fs.existsSync(absolute)) {
          context.output.success(`ok ${file}`);
        } else {
          context.output.error(`missing ${file}`);
        }
      }
    });
}
