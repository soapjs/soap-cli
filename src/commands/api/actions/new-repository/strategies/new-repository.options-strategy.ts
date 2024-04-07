import chalk from "chalk";
import { NewRepositoryOptions } from "../types";
import { ApiGenerator, ApiJsonParser } from "../../../common";
import {
  Config,
  RepositoryJson,
  Strategy,
  Texts,
} from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../../core";
import { paramCase } from "change-case";

export class NewRepositoryOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }
  public async apply(
    options: NewRepositoryOptions,
    cliPluginPackageName: string
  ) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.presets.repository.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, entity, model, impl, storage, collection } =
      options;

    const repository: RepositoryJson = {
      name,
      endpoint,
      entity: entity || name,
      contexts: [],
      impl: storage.length > 1 || impl,
      write_method: command.write_method,
      rank: 0,
    };

    if (model) {
      storage.forEach((type) => {
        repository.contexts.push({
          type,
          model,
          collection: {
            name,
            impl: collection,
            table: paramCase(`${name}.collection`),
          },
        });
      });
    } else {
      repository.contexts.push(...storage);
    }

    const schema = new ApiJsonParser(config, command, texts).build({
      repositories: [repository],
    });

    const result = await new ApiGenerator(
      config,
      compilation,
      cliPluginPackageName
    ).generate(schema);

    if (result.isFailure) {
      console.log(result.failure.error);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
