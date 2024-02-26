import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../../core";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class SelectCollectionStoragesFrame extends Frame<string[]> {
  public static NAME = "select_collection_storages_frame";
  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(SelectCollectionStoragesFrame.NAME);
  }

  public async run() {
    const { texts, config } = this;
    const choices: {}[] = [];
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
        texts.get("please_select_collection_storages"),
        choices,
        ["cache"],
        texts.get("hint___please_select_collection_storages")
      );
    } while (list.length === 0);

    return list;
  }
}
