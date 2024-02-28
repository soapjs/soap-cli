import {
  Config,
  Component,
  LauncherElement,
  LauncherType,
  WriteMethod,
  EmptyFileData,
  EmptyFileSchema,
} from "@soapjs/soap-cli-common";
import { nanoid } from "nanoid";

export class LauncherFactory {
  public static create(config: Config): Component<LauncherElement> {
    const { defaults } = config.components.launcher;
    const props = [];
    const imports = [];
    let functions = [];
    let exp;

    const componentName = config.components.launcher.generateName("launcher");
    const componentPath = config.components.launcher.generatePath({
      name: "launcher",
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

    const classData: EmptyFileData = {
      name: componentName,
      props,
      imports,
      functions,
      exp,
    };

    const element = EmptyFileSchema.create<LauncherElement>(classData, config, {
      addons: {},
      dependencies: [],
    });

    const component = Component.create<LauncherElement>(config, {
      id: nanoid(),
      type: LauncherType.create(componentName, "launcher"),
      path: componentPath,
      writeMethod: WriteMethod.Write,
      element,
    });

    return component;
  }
}
