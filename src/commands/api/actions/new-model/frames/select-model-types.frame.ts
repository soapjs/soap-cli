import { Config, Texts } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class SelectModelTypesFrame extends Frame<string[]> {
  public static NAME = "select_model_types_frame";
  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(SelectModelTypesFrame.NAME);
  }

  public async run() {
    const { texts, config } = this;
    const choices: {}[] = [
      {
        message: texts.get("JSON"),
        name: "json",
        value: true,
      },
    ];
    let list: string[];

    config.databases.forEach((db) => {
      choices.push({
        message: db.name,
        name: db.alias,
        value: true,
      });
    });

    do {
      list = await InteractionPrompts.multiSelect<string[]>(
        texts.get("please_select_model_types"),
        choices,
        ["json"],
        texts.get("hint___please_select_model_types")
      );
    } while (list.length === 0);

    return list;
  }
}
