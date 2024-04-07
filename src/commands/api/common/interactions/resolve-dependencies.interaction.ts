import { TypeInfo } from "@soapjs/soap-cli-common";
import { Interaction } from "@soapjs/soap-cli-interactive";
import { WriteMethodsAssignment } from "../../../../core";

type Deps = { entities: any[]; models: any[] };

export class ResolveDependneciesInteraction extends Interaction<Deps> {
  constructor(private writeMethods: WriteMethodsAssignment) {
    super();
  }
  public async run(
    type: TypeInfo,
    endpoint: string,
    rank: number
  ): Promise<Deps> {
    const { writeMethods } = this;
    const models = [];
    const entities = [];

    if (type.isModel) {
      models.push({
        name: type.ref,
        types: ["json"],
        endpoint: endpoint,
        write_method: writeMethods.relatedComponentsMethods.model,
        rank,
      });
    } else if (type.isEntity) {
      entities.push({
        name: type.ref,
        endpoint: endpoint,
        write_method: writeMethods.relatedComponentsMethods.entity,
        rank,
      });
    }
    return { models, entities };
  }
}
