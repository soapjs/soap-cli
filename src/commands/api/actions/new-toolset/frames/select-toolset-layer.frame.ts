import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../../core";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class SelectToolsetlayerFrame extends Frame<string[]> {
  public static NAME = "select_toolset_layer_frame";
  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(SelectToolsetlayerFrame.NAME);
  }

  public async run() {
    const { texts, config } = this;
    const choices: {}[] = [
      {
        message: "Domain",
        name: "domain",
        value: true,
      },
      {
        message: "Data",
        name: "data",
        value: true,
      },
      {
        message: "Infra",
        name: "infra",
        value: true,
      },
    ];
    let list: string[];
    do {
      list = await InteractionPrompts.select<string[]>(
        texts.get("please_select_toolset_layer"),
        choices,
        ["domain"],
        texts.get("hint___please_select_toolset_layer")
      );
    } while (list.length === 0);

    return list;
  }
}
