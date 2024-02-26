import { existsSync } from "fs";
import { Config, EntityType } from "../../../../../core";
import { ApiJson } from "../../../common";
import { ControllerJson, HandlerJson } from "../../new-controller";
import { EntityJson } from "../../new-entity";
import { PathParamsTools, QueryParamsTools } from "../parsers";
import { Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class DescribeControllerFrame extends Frame<ApiJson> {
  public static NAME = "describe_controller_frame";
  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(DescribeControllerFrame.NAME);
  }

  public async run(context: {
    endpoint: string;
    controller: string;
    handler: string;
    request_body: any;
    response_body: any;
    path: string;
  }) {
    const { texts, config } = this;
    const { endpoint, controller, handler, request_body, response_body, path } =
      context;
    const controllers: ControllerJson[] = [];
    const entities: EntityJson[] = [];
    const cPath = config.components.controller.generatePath({
      name: controller,
      endpoint,
    }).path;

    let input: EntityJson = { name: `${handler}Input`, endpoint, props: [] };
    let output: EntityJson = { name: `${handler}Output`, endpoint, props: [] };
    let h: HandlerJson = { name: handler };
    let writeMethod = config.command.dependencies_write_method;

    if (writeMethod !== WriteMethod.Skip) {
      const message = existsSync(cPath)
        ? "do_you_want_to_update_controller_###"
        : "do_you_want_to_create_controller_###";

      if (
        await InteractionPrompts.confirm(
          texts.get(message).replace("###", controller || "")
        )
      ) {
        const params = [
          ...PathParamsTools.extractFromString(path),
          ...QueryParamsTools.extractFromString(path),
        ];

        params.forEach((k) => {
          input.props.push({ name: k, type: "string" });
        });

        if (request_body && typeof request_body === "object") {
          Object.keys(request_body).forEach((k) => {
            input.props.push({ name: k, type: request_body[k] });
          });
        } else if (request_body) {
          input.props.push({
            name: `data${input.props.length}`,
            type: request_body,
          });
        }

        if (input.props.length > 0) {
          h.input = EntityType.create(
            config.components.entity.generateName(input.name),
            input.name
          ).tag;
          entities.push(input);
        }

        /*
         */

        if (response_body && typeof response_body === "object") {
          Object.keys(response_body).forEach((k) => {
            output.props.push({ name: k, type: response_body[k] });
          });
        } else if (response_body) {
          output.props.push({
            name: `data${output.props.length}`,
            type: response_body,
          });
        }

        if (output.props.length > 0) {
          h.output = EntityType.create(
            config.components.entity.generateName(output.name),
            output.name
          ).tag;
          entities.push(output);
        }

        controllers.push({
          name: controller,
          endpoint: endpoint,
          handlers: [h],
        });
      }
    }

    return { controllers, entities };
  }
}
