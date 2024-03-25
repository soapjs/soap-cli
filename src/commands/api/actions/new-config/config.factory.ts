import {
  Config,
  Component,
  ConfigElement,
  WriteMethod,
  ConfigAddons,
  ConfigType,
  SourceFileData,
  SourceFileSchema,
} from "@soapjs/soap-cli-common";
import { nanoid } from "nanoid";

export class ConfigFactory {
  public static create(config: Config): Component<ConfigElement, ConfigAddons> {
    const { defaults } = config.presets.config;
    const props = [];
    const imports = [];
    let functions = [];
    let exp;

    const componentName = config.presets.config.generateName("config");
    const componentPath = config.presets.config.generatePath({
      name: "config",
    }).path;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (Array.isArray(defaults?.common?.functions)) {
      functions.push(...defaults.common.functions);
    }

    if (Array.isArray(defaults?.common?.imports)) {
      defaults.common.imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    if (Array.isArray(defaults?.common?.props)) {
      props.push(...defaults.common.props);
    }

    const classData: SourceFileData = {
      name: componentName,
      props,
      imports,
      functions,
      exp,
    };

    const element = SourceFileSchema.create<ConfigElement>(classData, config, {
      addons: {},
      dependencies: [],
    });

    const component = Component.create<ConfigElement>(config, {
      id: nanoid(),
      type: ConfigType.create(componentName, "config"),
      path: componentPath,
      writeMethod: WriteMethod.Write,
      element,
    });

    return component;
  }
}
