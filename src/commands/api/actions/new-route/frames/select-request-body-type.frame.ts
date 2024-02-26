import { Texts } from "@soapjs/soap-cli-common";
import { CreateObjectPropInteraction } from "./interactions/create-object-prop.interaction";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export type RequestBodyType = {
  request_body: any;
};

export class SelectRequestBodyTypeFrame extends Frame<RequestBodyType> {
  public static NAME = "select_request_body_type_frame";
  constructor(protected texts: Texts) {
    super(SelectRequestBodyTypeFrame.NAME);
  }

  public async run() {
    const { texts } = this;

    const choices = [
      {
        message: texts.get("none"),
        name: "none",
      },
      {
        message: texts.get("various"),
        name: "various",
      },
      {
        message: texts.get("array"),
        name: "array",
      },
      {
        message: texts.get("object"),
        name: "object",
      },
      {
        message: texts.get("string"),
        name: "string",
      },
    ];

    let request_body;

    do {
      request_body = await InteractionPrompts.select(
        texts.get("what_type_of_data_will_the_request_body_contain"),
        choices,
        ["none"],
        texts.get("hint___what_type_of_data_will_the_request_body_contain")
      );
    } while (request_body.length === 0);

    if (
      request_body === "object" &&
      (await InteractionPrompts.confirm(
        texts.get("do_you_want_to_define_the_properties_of_this_object")
      ))
    ) {
      let prop;
      request_body = {};

      do {
        prop = await new CreateObjectPropInteraction(texts).run();
        request_body[prop.name] = prop.type;
      } while (
        await InteractionPrompts.confirm(
          texts
            .get("prop_###_has_been_added__add_more")
            .replace("###", prop?.name)
        )
      );
    } else if (request_body === "various") {
      request_body = "any";
    } else if (request_body === "none") {
      request_body = null;
    }

    return { request_body };
  }
}
