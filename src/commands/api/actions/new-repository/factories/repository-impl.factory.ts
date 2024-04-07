import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  ConstructorDataParser,
  DataContext,
  DataProvider,
  InterfaceSchema,
  ParamDataParser,
  Repository,
  RepositoryElement,
  RepositoryImplType,
} from "@soapjs/soap-cli-common";
import { RepositoryFactoryInput } from "../types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../../common/input-to-data.parser";

export class RepositoryImplFactory {
  static create(
    input: RepositoryFactoryInput,
    contexts: DataContext[],
    repository: Repository,
    config: Config,
    dependencies: Component[]
  ): Component<RepositoryElement> {
    const { id, name, endpoint, is_custom, write_method } = input;
    const references = {
      addons: { is_custom },
      dependencies: dependencies || [],
    };
    contexts.forEach((ctx) => {
      references.dependencies.push(ctx.model);
    });

    const types = contexts.map((c) => c.model.type.type);
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "repository_impl",
      input,
      new DefaultGroups(["common", ...types]),
      references
    );

    if (config.presets.repository_impl.defaults.common.ctor) {
      data.element.ctor = ConstructorDataParser.parse(
        config.presets.repository_impl.defaults.common.ctor,
        config,
        references
      ).data;

      for (const context of contexts) {
        const ctxCtor =
          config.presets.repository_impl.defaults[context.model.type.type].ctor;

        if (Array.isArray(ctxCtor.params)) {
          ctxCtor.params.forEach((param) => {
            data.element.ctor.params.push(
              ParamDataParser.parse(param, config, references).data
            );
          });
        }
      }
    }

    const element = ClassSchema.create<RepositoryElement>(
      new DataProvider(data.element),
      config,
      references
    );

    if (repository) {
      element.addInterface(
        InterfaceSchema.create({ name: repository.type.name }, config)
      );
    }

    const component = Component.create<RepositoryElement>(config, {
      id,
      type: RepositoryImplType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: null,
      element,
      dependencies: references.dependencies,
      rank: data.element.rank,
    });

    return component;
  }
}
