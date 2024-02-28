import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../../core";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { paramCase } from "change-case";
import { DataContextJson } from "../types";

export type RepositoryDescription = {
  createImplementation: boolean;
  willHaveAdditionalContent: boolean;
  contexts: DataContextJson[];
};

export class DescribeRepositoryFrame extends Frame<RepositoryDescription> {
  public static NAME = "describe_repository_frame";
  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(DescribeRepositoryFrame.NAME);
  }

  private async selectDatabases(availableDBs: any[], multiple: boolean) {
    const { texts } = this;

    let result: string | string[];
    do {
      if (multiple) {
        result = await InteractionPrompts.multiSelect<string[]>(
          texts.get("please_select_the_databases_you_want_to_use"),
          availableDBs
        );
      } else {
        result = await InteractionPrompts.select<string>(
          texts.get("please_select_the_database_you_want_to_use"),
          availableDBs
        );
      }
    } while (result.length === 0);

    return typeof result === "string" ? [result] : result;
  }

  private async createContexts(
    dbs: string[],
    availableDBs: any[],
    name: string
  ): Promise<DataContextJson[]> {
    const { texts } = this;

    const inputs = dbs.map((db) => {
      const dbDesc = availableDBs.find((adb) => adb.alias === db);
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
        table: tables[alias],
      },
    }));
  }

  public async run(context: { name: string }) {
    const { texts, config } = this;
    const availableDBs = config.databases.map((db) => ({
      message: db.name,
      name: db.alias,
      value: true,
    }));
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

    let selectedRepoImplType = "";
    let createImplementation = false;
    let willHaveAdditionalContent = false;
    let databases = [];

    if (
      await InteractionPrompts.confirm(
        texts.get("will_your_repository_use_multiple_databases")
      )
    ) {
      databases = await this.selectDatabases(availableDBs, true);
    } else {
      databases = await this.selectDatabases(availableDBs, false);
    }

    const contexts = await this.createContexts(
      databases,
      availableDBs,
      context.name
    );

    if (databases.length > 1) {
      createImplementation = true;
    } else {
      do {
        selectedRepoImplType = await InteractionPrompts.select<string>(
          texts.get("what_repository_implementation_type"),
          choices,
          [],
          texts.get("hint___what_repository_implementation_type")
        );
      } while (selectedRepoImplType === "");

      createImplementation = selectedRepoImplType === "custom_impl";
    }

    willHaveAdditionalContent = await InteractionPrompts.confirm(
      texts.get("will_your_repository_contain_additional_properties_or_methods")
    );

    return {
      createImplementation,
      willHaveAdditionalContent,
      contexts,
    };
  }
}
