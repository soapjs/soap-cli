import { Command } from "commander";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getCommandContext, PackageManager } from "../../core/command-context";
import { CliError } from "../../core/errors";
import { writeSoapConfig } from "../../config/write-soap-config";
import { resolveDependencies } from "../../dependencies/dependency-resolver";
import { detectPackageManager, installCommand, installCommandParts } from "../../dependencies/package-manager";
import { writePlannedFiles } from "../../io/file-writer";
import { upsertGeneratedFile, hashContent } from "../../registry/registry.service";
import {
  addConflictOption,
  addInteractiveOption,
  assertInteractiveTerminal,
  ConflictCommandOptions,
  InteractiveCommandOptions,
} from "../shared/common-options";
import {
  createProjectFiles,
  createSoapConfigBundle,
  ProjectPlan,
  targetRoot,
} from "./project-plan";
import { createConfigResolver } from "../../resolvers/create-config.resolver";
import { InquirerPromptAdapter, promptCreateProject } from "../../prompts";
import { formatCreateSummary } from "../../summary";
import { resolveCreatePreset } from "../../presets";

interface CreateOptions extends InteractiveCommandOptions, ConflictCommandOptions {
  framework?: string;
  architecture?: "regular" | "cqrs";
  db?: string[];
  auth?: string[];
  messaging?: string[];
  telemetry?: string[];
  docs?: string[];
  contracts?: string[];
  apiClient?: string[];
  realtime?: string[];
  zones?: string;
  packageManager?: PackageManager;
  preset?: string;
  skipInstall?: boolean;
  install?: boolean;
  gitInit?: boolean;
  yes?: boolean;
  force?: boolean;
  writeNew?: boolean;
}

export function registerCreateCommand(program: Command): void {
  addConflictOption(addInteractiveOption(program
    .command("create <name>")
    .description("Create a new SoapJS service project.")
    .option("--framework <framework>", "framework adapter", "express")
    .option("--architecture <architecture>", "architecture mode: regular, cqrs", "regular")
    .option("--db <database>", "database capability: mongo, postgres, mysql, sqlite, redis, none", collect, [])
    .option("--auth <auth>", "auth capability: jwt, api-key, local, none", collect, [])
    .option("--messaging <messaging>", "messaging capability: in-memory, kafka, none", collect, [])
    .option("--telemetry <telemetry>", "telemetry capability: logs, otel-noop, metrics, memory, none", collect, [])
    .option("--docs <docs>", "docs capability: openapi, none", collect, [])
    .option("--contracts <contracts>", "contract capability: zod, none", collect, [])
    .option("--api-client <client>", "api client capability: bruno, none", collect, [])
    .option("--realtime <realtime>", "realtime capability: ws, none", collect, [])
    .option("--zones <zones>", "comma-separated zones", "public,private,admin")
    .option("--package-manager <manager>", "package manager: npm, pnpm, yarn, bun")
    .option("--preset <preset>", "create preset")
    .option("--skip-install", "do not install dependencies", false)
    .option("--install", "install dependencies after generation", false)
    .option("--git-init", "initialize a git repository after generation", false)
    .option("--yes", "skip interactive confirmation prompts", false)
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)))
    .action(async (name: string, options: CreateOptions, command: Command) => {
      const preset = resolveCreatePreset(options.preset);
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const root = targetRoot(context.cwd, name);

      if (options.framework !== "express") {
        throw new CliError("Only --framework express is supported in this MVP.");
      }

      if (options.architecture !== "regular" && options.architecture !== "cqrs") {
        throw new CliError("Architecture must be regular or cqrs.");
      }

      if (fs.existsSync(root) && !fs.statSync(root).isDirectory()) {
        throw new CliError(`Target path exists and is not a directory: ${root}`);
      }

      const prompt = options.interactive ? new InquirerPromptAdapter() : undefined;
      const promptAnswers = prompt
        ? await promptCreateProject(prompt, {
            provided: createProvidedCreateOptions(command),
            preset: preset?.config,
          })
        : undefined;
      const resolved = createConfigResolver.resolve({
        flags: createExplicitCreateFlags(options, command),
        promptAnswers,
        preset: preset?.config,
      });
      const packageManager = detectPackageManager(root, resolved.packageManager);
      const dependencies = resolveDependencies(resolved.capabilities);
      const plan: ProjectPlan = {
        name,
        root,
        framework: resolved.framework,
        architecture: resolved.architecture,
        packageManager,
        capabilities: resolved.capabilities,
        zones: resolved.zones,
        dependencies,
      };
      const config = createSoapConfigBundle(plan);
      const files = createProjectFiles(plan);
      registerSoapConfigFiles(config);

      if (options.interactive) {
        context.output.info(formatCreateSummary(plan));

        if (!options.yes) {
          const confirmed = await prompt!.confirm({
            message: "Generate project?",
            defaultValue: true,
          });

          if (!confirmed) {
            context.output.warn("Project generation aborted.");
            return;
          }
        }
      }

      if (context.dryRun) {
        context.output.info(`Project: ${name}`);
        context.output.info(`Target: ${root}`);
        context.output.info(`Files: ${files.length + 4}`);
      }

      await writePlannedFiles(
        {
          root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
          onConflict: options.onConflict,
        },
        context
      );
      await writeSoapConfig(root, config, context);

      const shouldInstall = Boolean(options.install || promptAnswers?.install);
      const shouldGitInit = Boolean(options.gitInit || promptAnswers?.gitInit);

      if (context.dryRun) {
        if (shouldGitInit) {
          context.output.info("Would initialize git repository.");
        }
        if (shouldInstall && !options.skipInstall) {
          context.output.info(`Would run ${installCommand(packageManager)}.`);
        }
      } else {
        if (shouldGitInit) {
          await runPostCreateCommand({
            cwd: root,
            command: "git",
            args: ["init"],
            label: "git init",
            context,
          });
        }

        if (shouldInstall && !options.skipInstall) {
          const install = installCommandParts(packageManager);
          await runPostCreateCommand({
            cwd: root,
            command: install.command,
            args: install.args,
            label: installCommand(packageManager),
            context,
          });
        } else if (shouldInstall && options.skipInstall) {
          context.output.warn("Skipping dependency installation because --skip-install was provided.");
        }
      }

      context.output.success(`Created SoapJS project at ${path.relative(context.cwd, root) || root}`);
    });
}

function createProvidedCreateOptions(command: Command): Record<string, boolean> {
  return {
    framework: isCliOption(command, "framework"),
    architecture: isCliOption(command, "architecture"),
    db: isCliOption(command, "db"),
    auth: isCliOption(command, "auth"),
    messaging: isCliOption(command, "messaging"),
    telemetry: isCliOption(command, "telemetry"),
    docs: isCliOption(command, "docs"),
    contracts: isCliOption(command, "contracts"),
    apiClient: isCliOption(command, "apiClient"),
    realtime: isCliOption(command, "realtime"),
    zones: isCliOption(command, "zones"),
    packageManager: isCliOption(command, "packageManager"),
    install: isCliOption(command, "install") || isCliOption(command, "skipInstall"),
    gitInit: isCliOption(command, "gitInit"),
  };
}

function createExplicitCreateFlags(options: CreateOptions, command: Command): CreateOptions {
  return {
    framework: isCliOption(command, "framework") ? options.framework : undefined,
    architecture: isCliOption(command, "architecture") ? options.architecture : undefined,
    db: isCliOption(command, "db") ? options.db : undefined,
    auth: isCliOption(command, "auth") ? options.auth : undefined,
    messaging: isCliOption(command, "messaging") ? options.messaging : undefined,
    telemetry: isCliOption(command, "telemetry") ? options.telemetry : undefined,
    docs: isCliOption(command, "docs") ? options.docs : undefined,
    contracts: isCliOption(command, "contracts") ? options.contracts : undefined,
    apiClient: isCliOption(command, "apiClient") ? options.apiClient : undefined,
    realtime: isCliOption(command, "realtime") ? options.realtime : undefined,
    zones: isCliOption(command, "zones") ? options.zones : undefined,
    packageManager: isCliOption(command, "packageManager") ? options.packageManager : undefined,
  };
}

function isCliOption(command: Command, name: string): boolean {
  return command.getOptionValueSource(name) === "cli";
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

async function runPostCreateCommand(options: {
  cwd: string;
  command: string;
  args: string[];
  label: string;
  context: ReturnType<typeof getCommandContext>;
}): Promise<void> {
  options.context.output.info(`Running ${options.label}...`);

  try {
    await runCommand(options.command, options.args, options.cwd, options.context.silent);
    options.context.output.success(`Finished ${options.label}.`);
  } catch (error) {
    options.context.output.warn(`${options.label} failed: ${(error as Error).message}`);
  }
}

function runCommand(command: string, args: string[], cwd: string, silent: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: silent ? "ignore" : "inherit",
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

function registerSoapConfigFiles(config: ReturnType<typeof createSoapConfigBundle>): void {
  const entries = [
    { path: ".soap/project.json", content: JSON.stringify(config.project, null, 2), type: "config" as const },
    { path: ".soap/structure.json", content: JSON.stringify(config.structure, null, 2), type: "config" as const },
    { path: ".soap/api.json", content: JSON.stringify(config.api, null, 2), type: "config" as const },
  ];

  for (const entry of entries) {
    upsertGeneratedFile(config.registry, {
      path: entry.path,
      type: entry.type,
      hash: hashContent(`${entry.content}\n`),
    });
  }
}
