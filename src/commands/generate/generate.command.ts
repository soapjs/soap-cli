import fs from "fs/promises";
import path from "path";
import { Command } from "commander";
import { getCommandContext } from "../../core/command-context";
import { CliError } from "../../core/errors";
import { loadSoapConfig } from "../../config/load-soap-config";
import { writeSoapConfig } from "../../config/write-soap-config";
import { writePlannedFiles } from "../../io/file-writer";
import {
  addConflictOption,
  addInteractiveOption,
  assertInteractiveTerminal,
  ConflictCommandOptions,
  InteractiveCommandOptions,
} from "../shared/common-options";
import { createBrunoFiles } from "./bruno-plan";
import { generateBrunoResolver } from "../../resolvers/generate-bruno.resolver";
import { InquirerPromptAdapter, promptGenerateBruno } from "../../prompts";
import {
  analyzeBrunoFiles,
  formatBrunoGenerationAnalysis,
  selectMissingBrunoFiles,
  selectUnmodifiedBrunoFiles,
} from "./bruno-analysis";

interface GenerateBrunoOptions extends InteractiveCommandOptions, ConflictCommandOptions {
  e2e?: boolean;
  force?: boolean;
  writeNew?: boolean;
}

interface GenerateOpenApiOptions {
  output?: string;
}

export function registerGenerateCommand(program: Command): void {
  const generate = program.command("generate").description("Generate secondary artifacts.");

  addConflictOption(addInteractiveOption(generate
    .command("bruno")
    .description("Generate Bruno collection files from .soap registry metadata.")
    .option("--e2e", "generate runnable CRUD E2E flow requests", false)
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)))
    .action(async (options: GenerateBrunoOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);

      const resolved = generateBrunoResolver.resolve({ flags: options, projectConfig: config });

      let files = createBrunoFiles(config, { e2e: resolved.e2e });

      if (options.interactive) {
        const prompt = new InquirerPromptAdapter();
        const baseFiles = createBrunoFiles(config);
        const baseAnalysis = await analyzeBrunoFiles(config, baseFiles);

        context.output.info(formatBrunoGenerationAnalysis(baseAnalysis));

        const mode = isCliOption(command, "e2e")
          ? "e2e"
          : (await promptGenerateBruno(prompt, baseAnalysis)).mode;

        if (mode === "abort") {
          context.output.warn("Bruno generation aborted.");
          return;
        }

        if (mode === "missing") {
          files = selectMissingBrunoFiles(baseAnalysis);
        }

        if (mode === "all") {
          files = options.force ? baseFiles : selectUnmodifiedBrunoFiles(baseAnalysis);
        }

        if (mode === "e2e") {
          const e2eFiles = createBrunoFiles(config, { e2e: true });
          const e2eAnalysis = await analyzeBrunoFiles(config, e2eFiles);
          files = options.force ? e2eFiles : selectUnmodifiedBrunoFiles(e2eAnalysis);
        }

        if (files.length === 0) {
          context.output.warn("No Bruno files selected for generation.");
          return;
        }
      }

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
          onConflict: options.onConflict,
          skipModified: !options.force && !options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Generated Bruno collection with ${files.length} files.`);
    });

  generate
    .command("openapi")
    .description("Fetch OpenAPI JSON from the running local API.")
    .option("--output <path>", "write OpenAPI JSON to a file instead of stdout")
    .action(async (options: GenerateOpenApiOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);

      if (!config.project.capabilities.docs.includes("openapi")) {
        throw new CliError("OpenAPI is not enabled for this project. Create the project with `--docs openapi`.");
      }

      const openApiUrl = createOpenApiUrl(config.api.baseUrl);

      if (options.output) {
        const outputPath = path.resolve(context.cwd, options.output);

        if (context.dryRun) {
          context.output.info(`[dry-run] write ${outputPath}`);
          return;
        }

        const content = await fetchOpenApiJson(openApiUrl);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content, "utf8");
        context.output.success(`Wrote OpenAPI JSON to ${options.output}`);
        return;
      }

      const content = await fetchOpenApiJson(openApiUrl);

      context.output.info(content);
    });
}

function isCliOption(command: Command, name: string): boolean {
  return command.getOptionValueSource(name) === "cli";
}

function createOpenApiUrl(baseUrl: string): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalized}/openapi.json`;
}

async function fetchOpenApiJson(url: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    throw new CliError(`Could not fetch OpenAPI JSON from ${url}. Start the API and run again.`);
  }

  if (!response.ok) {
    throw new CliError(`Could not fetch OpenAPI JSON from ${url}. Server returned ${response.status} ${response.statusText}.`);
  }

  const text = await response.text();

  try {
    return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  } catch (error) {
    throw new CliError(`OpenAPI endpoint ${url} did not return valid JSON.`);
  }
}
