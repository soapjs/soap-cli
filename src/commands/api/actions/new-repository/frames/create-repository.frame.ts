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
import { CommandConfig } from "../../../../../core";

export class CreateRepositoryFrame extends Frame<ApiJson> {
  public static NAME = "create_repository_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateRepositoryFrame.NAME);
  }

  public async run(
    context: RepositoryDescription &
      RepositoryNameAndEndpoint & { entity: EntityJson; models: ModelJson[] }
  ) {
    const { texts, config, command } = this;
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
    let writeMethod = WriteMethod.Write;

    if (command.force === false) {
      if (existsSync(componentPath)) {
        writeMethod = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (writeMethod !== WriteMethod.Skip) {
      const contexts = [...context.contexts];
      let defineMethodsResult = { methods: [], entities: [], models: [] };

      if (willHaveAdditionalContent) {
        const references = { models: [...models], entities: [] };
        if (entity) {
          references.entities.push(entity);
        }
        defineMethodsResult = await new DefineMethodsInteraction(
          texts,
          config,
          command.dependencies_write_method,
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
      });
    }

    return result;
  }
}
