import { MethodJson, Texts } from "@soapjs/soap-cli-common";
import { SchemaTools } from "../../../../core/components";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class DefineMethodInteraction extends Interaction<MethodJson> {
  constructor(private texts: Texts) {
    super();
  }
  public async run(options?: {
    message?: string;
    initialAccess?: string;
    initialName?: string;
    initialReturnType?: string;
    initialIsStatic?: boolean;
    initialIsAsync?: boolean;
  }): Promise<MethodJson> {
    const { texts } = this;
    let method;

    do {
      method = await InteractionPrompts.form(
        options?.message || texts.get("method_form_title"),
        [
          {
            name: "name",
            message: texts.get("name"),
            initial: options?.initialName,
          },
          {
            name: "return_type",
            message: texts.get("return_type"),
            initial: options?.initialReturnType || "string",
          },
          {
            name: "params",
            message: texts.get("params"),
            hint: texts.get("hint___params"),
          },
          {
            name: "access",
            message: texts.get("access"),
            initial: options?.initialAccess || "public",
          },
          {
            name: "is_async",
            message: texts.get("is_async"),
            initial: `${options?.initialIsAsync || false}`,
          },
          {
            name: "is_static",
            message: texts.get("is_static"),
            initial: `${options?.initialIsStatic || false}`,
          },
        ]
      );
    } while (!method.name);

    const temp =
      typeof method.params === "string"
        ? SchemaTools.splitIgnoringBrackets(method.params, ",")
        : [];

    return {
      access: method.access,
      name: method.name,
      return_type: method.return_type,
      is_async: method.is_async === "true",
      is_static: method.is_static === "true",
      params: temp,
    };
  }
}
