import { Config, DataContextJson, Texts } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { paramCase } from "change-case";

export type RepositoryDescription = {
  createImplementation: boolean;
  willHaveAdditionalContent: boolean;
  contexts: DataContextJson[];
};

export class DescribeRepositoryFrame extends Frame<RepositoryDescription> {
  public static NAME = "describe_repository_frame";
  constructor(protected config: Config, protected texts: Texts) {
    super(DescribeRepositoryFrame.NAME);
  }

  private async selectDatabases(multiple: boolean) {
    const { texts, config } = this;
    const choices = config.databases.map((db) => ({
      message: db.name,
      name: db.alias,
      value: true,
    }));
    let result: string | string[];
    do {
      if (multiple) {
        result = await InteractionPrompts.multiSelect<string[]>(
          texts.get("please_select_the_databases_you_want_to_use"),
          choices
        );
      } else {
        result = await InteractionPrompts.select<string>(
          texts.get("please_select_the_database_you_want_to_use"),
          choices
        );
      }
    } while (result.length === 0);

    return typeof result === "string" ? [result] : result;
  }

  private async createContexts(
    dbs: string[],
    name: string
  ): Promise<DataContextJson[]> {
    const { texts, config } = this;

    const inputs = dbs.map((db) => {
      const dbDesc = config.databases.find((adb) => adb.alias === db);
      return {
        name: db,
        message: dbDesc.name,
        initial: paramCase(`${name}.collection`),
      };
    });

    const tables: { [key: string]: string } = await InteractionPrompts.form(
      texts.get("tables_form_title"),
      inputs
    );

    return Object.keys(tables).map((alias) => ({
      type: alias,
      collection: {
        name,
        impl: false,
        table: tables[alias],
      },
    }));
  }

  public async run(context: { name: string }) {
    const { texts } = this;
    const choices = [
      {
        message: texts.get("default_repository_implementation"),
        name: "default_impl",
      },
      {
        message: texts.get("custom_repository_implementation"),
        name: "custom_impl",
      },
    ];

    let createImplementation = false;
    let willHaveAdditionalContent = false;
    let databases = [];

    if (
      await InteractionPrompts.confirm(
        texts.get("will_your_repository_use_multiple_databases")
      )
    ) {
      databases = await this.selectDatabases(true);
    } else {
      databases = await this.selectDatabases(false);
    }

    const contexts = await this.createContexts(databases, context.name);

    willHaveAdditionalContent = await InteractionPrompts.confirm(
      texts.get("will_your_repository_contain_additional_properties_or_methods")
    );

    createImplementation = willHaveAdditionalContent || databases.length > 1;

    return {
      createImplementation,
      willHaveAdditionalContent,
      contexts,
    };
  }
}
