import chalk from "chalk";
import { NewRepositoryOptions, RepositoryJson } from "./types";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { Strategy, Texts } from "@soapjs/soap-cli-common";
import { CliOptionsTools, Config } from "../../../../core";
import { paramCase } from "change-case";

export class NewRepositoryOptionsStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }
  public async apply(
    options: NewRepositoryOptions,
    cliPluginPackageName: string
  ) {
    const { config } = this;
    const texts = await Texts.load();

    if (
      !options.endpoint &&
      config.components.repository.isEndpointRequired()
    ) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, entity, model, impl } = options;
    const storages = CliOptionsTools.splitArrayOption(options.storage);

    const repository: RepositoryJson = {
      name,
      endpoint,
      entity: entity || name,
      contexts: [],
      impl: storages.length > 1 || impl,
    };

    if (model) {
      storages.forEach((type) => {
        repository.contexts.push({
          type,
          model,
          collection: {
            name,
            impl: false,
            table: paramCase(`${name}.collection`),
          },
        });
      });
    } else {
      repository.contexts.push(...storages);
    }

    const schema = new ApiJsonParser(config, texts).build({
      repositories: [repository],
    });

    const result = await new ApiGenerator(
      config,
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
