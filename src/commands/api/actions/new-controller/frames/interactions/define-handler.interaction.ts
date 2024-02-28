import { HandlerJson, Texts } from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class DefineHandlerInteraction extends Interaction<HandlerJson> {
  constructor(private texts: Texts) {
    super();
  }
  public async run(options?: { initialName?: string }): Promise<HandlerJson> {
    const { texts } = this;
    let handler;

    do {
      handler = await InteractionPrompts.form(texts.get("handler_form_title"), [
        {
          name: "name",
          message: texts.get("name"),
          initial: options?.initialName,
        },
        {
          name: "input",
          message: texts.get("controller_input_type"),
          hint: texts.get("hint___controller_input_type"),
        },
        {
          name: "output",
          message: texts.get("controller_output_type"),
          initial: "void",
          hint: texts.get("hint___controller_output_type"),
        },
      ]);
    } while (!handler.name);

    return handler;
  }
}
