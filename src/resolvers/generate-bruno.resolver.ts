import { SoapConfig } from "../config/schemas/types";
import { CliError } from "../core/errors";
import { CommandInputResolver } from "./resolver.types";

export interface GenerateBrunoInput {
  e2e?: boolean;
}

export interface GenerateBrunoResult {
  e2e: boolean;
}

export class GenerateBrunoResolver
  implements CommandInputResolver<GenerateBrunoInput, GenerateBrunoInput, SoapConfig, GenerateBrunoResult>
{
  resolve(input: {
    flags: GenerateBrunoInput;
    promptAnswers?: GenerateBrunoInput;
    projectConfig?: SoapConfig;
    preset?: Partial<GenerateBrunoResult>;
  }): GenerateBrunoResult {
    const config = input.projectConfig;

    if (!config) {
      throw new CliError("Project config is required to resolve Bruno generation input.");
    }

    if (!config.project.capabilities.apiClient.includes("bruno") && !config.api.bruno.enabled) {
      throw new CliError("Bruno is not enabled for this project. Create the project with `--api-client bruno`.");
    }

    return {
      e2e: Boolean(pick(input.flags.e2e, input.promptAnswers?.e2e, input.preset?.e2e, false)),
    };
  }
}

function pick<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

export const generateBrunoResolver = new GenerateBrunoResolver();
