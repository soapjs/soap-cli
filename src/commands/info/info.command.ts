import { Command } from "commander";
import { getCommandContext } from "../../core/command-context";
import { loadSoapConfig } from "../../config/load-soap-config";

export function registerInfoCommand(program: Command): void {
  program
    .command("info")
    .description("Print SoapJS project metadata.")
    .action(async (_options: unknown, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const project = config.project;

      context.output.info(`Name: ${project.name}`);
      context.output.info(`Root: ${config.root}`);
      context.output.info(`Framework: ${project.framework}`);
      context.output.info(`Architecture: ${project.architecture}`);
      context.output.info(`Package manager: ${project.packageManager}`);
      context.output.info(`Databases: ${project.capabilities.databases.join(", ") || "none"}`);
      context.output.info(`Auth: ${project.capabilities.auth.join(", ") || "none"}`);
      context.output.info(`Messaging: ${project.capabilities.messaging.join(", ") || "none"}`);
      context.output.info(`Zones: ${project.zones.join(", ")}`);
      context.output.info(`Generated files: ${config.registry.generatedFiles.length}`);
    });
}
