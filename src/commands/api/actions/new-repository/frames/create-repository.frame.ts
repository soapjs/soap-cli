import { existsSync } from "fs";
import {
  DefineMethodsInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { RepositoryDescription } from "./describe-repository.frame";
import { RepositoryNameAndEndpoint } from "./define-repository-name-and-endpoint.frame";
import {
  ApiJson,
  Config,
  EntityJson,
  ModelJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";

export class CreateRepositoryFrame extends Frame<ApiJson> {
  public static NAME = "create_repository_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(CreateRepositoryFrame.NAME);
  }

  public async run(
    context: RepositoryDescription &
      RepositoryNameAndEndpoint & { entity: EntityJson; models: ModelJson[] }
  ) {
    const { texts, config, command, writeMethods } = this;
    const {
      name,
      endpoint,
      entity,
      models,
      willHaveAdditionalContent,
      createImplementation,
    } = context;
    const result: ApiJson = { models: [], entities: [], repositories: [] };
    const componentName = config.presets.repository.generateName(name);
    const componentPath = config.presets.repository.generatePath({
      name,
      endpoint,
    }).path;
    let write_method = command.write_method;

    if (command.force === false) {
      if (existsSync(componentPath) && write_method !== WriteMethod.Patch) {
        write_method = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    const contexts = [...context.contexts];
    let defineMethodsResult = { methods: [], entities: [], models: [] };

    if (willHaveAdditionalContent && write_method !== WriteMethod.Skip) {
      const references = { models: [...models], entities: [] };
      if (entity) {
        references.entities.push(entity);
      }
      defineMethodsResult = await new DefineMethodsInteraction(
        texts,
        config,
        writeMethods,
        references
      ).run({ endpoint: endpoint, component: "repository" });

      result.entities.push(...defineMethodsResult.entities);
      result.models.push(...defineMethodsResult.models);
    }

    contexts.forEach((ctx) => {
      const model = models.find((m) => m.types.includes(ctx.type));
      ctx.model = model.name;
    });

    result.repositories.push({
      name,
      methods: defineMethodsResult.methods,
      entity: entity.name,
      endpoint,
      impl: createImplementation,
      contexts,
      write_method,
      rank: 0,
    });

    return result;
  }
}
