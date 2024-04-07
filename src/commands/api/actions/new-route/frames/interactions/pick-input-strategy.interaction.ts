import { Texts } from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { PathParamsTools, QueryParamsTools } from "../../parsers";

export class PickInputStrategyInteraction extends Interaction<string> {
  constructor(private texts: Texts) {
    super();
  }
  public async run(request_body: any, path: string): Promise<string> {
    const { texts } = this;
    const params = [
      ...PathParamsTools.extractFromString(path),
      ...QueryParamsTools.extractFromString(path),
    ];
    const input_strategy_options = [
      {
        message: texts.get("handler_no_input"),
        name: "none",
      },
      {
        message: texts.get("handler_define_input"),
        name: "own",
      },
    ];

    if (params.length > 0 || request_body) {
      input_strategy_options.splice(1, 0, {
        message: texts.get("handler_use_request_for_input"),
        name: "request",
      });
    }

    return InteractionPrompts.select(
      texts.get("pick_handler_input_strategy"),
      input_strategy_options,
      ["none"],
      texts.get("hint___pick_handler_input_strategy")
    );
  }
}
