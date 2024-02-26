import { Texts } from "@soapjs/soap-cli-common";
import { InputTextInteraction } from "../../../common";
import { CreateObjectPropInteraction } from "./interactions/create-object-prop.interaction";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export type ResponseBodyType = {
  response_body: { [key: string]: any };
};

export class SelectResponseBodyTypeFrame extends Frame<ResponseBodyType> {
  public static NAME = "select_response_body_type_frame";
  constructor(protected texts: Texts) {
    super(SelectResponseBodyTypeFrame.NAME);
  }

  public async run() {
    const { texts } = this;

    const choices = [
      {
        message: texts.get("various"),
        name: "any",
      },
      {
        message: texts.get("array"),
        name: "Array<unknown>",
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

    let response_body = {};

    if (
      await InteractionPrompts.confirm(
        texts.get("do_you_want_to_define_the_content_of_the_response")
      )
    ) {
      let status;
      let type;

      do {
        status = await new InputTextInteraction(
          texts.get("please_provide_the_status_code")
        ).run({
          value: "200",
          hint: texts.get("hint___please_provide_the_status_code"),
        });

        do {
          type = await InteractionPrompts.select(
            texts.get("what_type_of_data_will_the_response_body_contain"),
            choices,
            ["string"],
            texts.get("hint___what_type_of_data_will_the_response_body_contain")
          );
        } while (type.length === 0);

        if (
          type === "object" &&
          (await InteractionPrompts.confirm(
            texts.get("do_you_want_to_define_the_properties_of_this_object")
          ))
        ) {
          let prop;
          let body = {};
          do {
            prop = await new CreateObjectPropInteraction(texts).run();
            body[prop.name] = prop.type;
          } while (
            await InteractionPrompts.confirm(
              texts
                .get("prop_###_has_been_added__add_more")
                .replace("###", prop?.name)
            )
          );
          response_body[status] = body;
        } else {
          response_body[status] = type;
        }
      } while (
        await InteractionPrompts.confirm(
          texts
            .get("added_response_for_status_###__do_you_want_to_add_more")
            .replace("###", status)
        )
      );
    }

    return { response_body };
  }
}
