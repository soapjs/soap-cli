import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../../core";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export type RepositoryDescription = {
  createInterface: boolean;
  createImplementation: boolean;
  createFactory: boolean;
  willHaveAdditionalContent: boolean;
  databases: string[];
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

  public async run() {
    const { texts, config } = this;
    const availableDBs = config.databases.map((db) => ({
      message: db.name,
      name: db.alias,
      value: true,
    }));
    const choices = [
      {
        message: texts.get("the_interface_and_the_implementation"),
        name: "interface_and_implementation",
      },
      {
        message: texts.get("only_the_interface"),
        name: "only_interface",
      },
      {
        message: texts.get("only_the_implementation"),
        name: "only_implementation",
      },
    ];

    let selectedComponents = "";
    let createInterface = false;
    let createImplementation = false;
    let createFactory = false;
    let willHaveAdditionalContent = false;
    let databases = [];

    do {
      selectedComponents = await InteractionPrompts.select<string>(
        texts.get("what_repository_components_do_you_want_to_create"),
        choices,
        [],
        texts.get("hint___please_select_repository_components_to_create")
      );
    } while (selectedComponents === "");

    createInterface = selectedComponents.includes("interface");
    createImplementation = selectedComponents.includes("implementation");

    if (createImplementation && createInterface) {
      createFactory = await InteractionPrompts.confirm(
        texts.get("do_you_also_want_to_create_factory_for_these_components")
      );
    }

    if (createImplementation) {
      if (
        await InteractionPrompts.confirm(
          texts.get("will_your_repository_use_multiple_databases")
        )
      ) {
        databases = await this.selectDatabases(availableDBs, true);
      } else {
        databases = await this.selectDatabases(availableDBs, false);
      }
    }

    willHaveAdditionalContent = await InteractionPrompts.confirm(
      texts.get("will_your_repository_contain_additional_properties_or_methods")
    );

    return {
      createInterface,
      createImplementation,
      createFactory,
      willHaveAdditionalContent,
      databases,
    };
  }
}
