import {
  ComponentJsonFactory,
  ComponentTools,
  Config,
  EntityJson,
  MethodJson,
  ModelJson,
  Texts,
  TypeInfo,
} from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { WriteMethodsAssignment } from "../../../../../../core";
import { pascalCase } from "change-case";
import { CreateHandlerOutputInteraction } from "../../../new-controller/frames/interactions/create-handler-output.interaction";

export class ResolveOutputStrategyInteraction extends Interaction<void> {
  constructor(
    protected config: Config,
    protected writeMethods: WriteMethodsAssignment,
    private texts: Texts
  ) {
    super();
  }
  public async run(
    output_strategy: string,
    handler: MethodJson,
    endpoint: string,
    response_body: any,
    models: ModelJson[],
    entities: EntityJson[]
  ): Promise<void> {
    const { texts, config, writeMethods } = this;
    const output: EntityJson = {
      name: pascalCase(`${handler.name}Output`),
      endpoint,
      props: [],
      write_method: writeMethods.relatedComponentsMethods.entity,
      rank: 2,
    };
    if (output_strategy === "response") {
      const outputInteraction = new CreateHandlerOutputInteraction(config);

      const outputResult = await outputInteraction.run({
        endpoint,
        response: response_body,
      });
      if (outputResult.output) {
        output.props.push(...outputResult.output.props);
        handler.return_type = `Entity<${output.name}>`;
      }
    }

    if (output_strategy === "own") {
      do {
        handler.return_type = await InteractionPrompts.input(
          texts.get("handler_return_type")
        );
      } while (!handler.return_type);

      const rType = TypeInfo.create(handler.return_type, config);
      const types = ComponentTools.filterComponentTypes(rType);
      types.forEach((componentType) => {
        const json = ComponentJsonFactory.create(componentType, {
          name: componentType.ref,
          types: ["json"],
          endpoint: endpoint,
          rank: 2,
        });

        if (rType.isModel) {
          json.write_method = writeMethods.relatedComponentsMethods.model;
          models.push(json);
        } else if (rType.isEntity) {
          json.write_method = writeMethods.relatedComponentsMethods.entity;
          entities.push(json);
        }
      });
    }
  }
}
