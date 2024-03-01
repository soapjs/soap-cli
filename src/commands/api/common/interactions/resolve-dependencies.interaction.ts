import { Texts, TypeInfo } from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

type Deps = { entities: any[]; models: any[] };

export class ResolveDependneciesInteraction extends Interaction<Deps> {
  constructor(private texts: Texts) {
    super();
  }
  public async run(type: TypeInfo, endpoint: string): Promise<Deps> {
    const { texts } = this;
    const models = [];
    const entities = [];

    if (
      type.isModel &&
      (await InteractionPrompts.confirm(
        texts.get("non_standard_type_detected__create_one")
      ))
    ) {
      models.push({
        name: type.ref,
        types: ["json"],
        endpoint: endpoint,
      });
    } else if (
      type.isEntity &&
      (await InteractionPrompts.confirm(
        texts.get("non_standard_type_detected__create_one")
      ))
    ) {
      entities.push({
        name: type.ref,
        endpoint: endpoint,
      });
    }
    return { models, entities };
  }
}
