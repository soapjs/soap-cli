import chalk from "chalk";
import { Config, Texts } from "@soapjs/soap-cli-common";
import { existsSync, readFileSync } from "fs";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common/api-generator";
import {
  CommandConfig,
  CompilationConfig,
  DefaultCliOptions,
} from "../../../../core";

export const fromJson = async (
  options: DefaultCliOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  const texts = await Texts.load();

  if (existsSync(options.json) === false) {
    console.log(
      chalk.red(
        texts.get("json_file_###_not_found").replace("###", options.json)
      )
    );
    process.exit(1);
  }

  try {
    const data = readFileSync(options.json, "utf-8");
    const json = JSON.parse(data);
    const schema = new ApiJsonParser(config, command, texts).build(json);
    const apiGenerator = new ApiGenerator(
      config,
      compilation,
      cliPluginPackageName
    );
    const result = await apiGenerator.generate(schema);

    if (result.isFailure) {
      console.log(result.failure.error);
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
