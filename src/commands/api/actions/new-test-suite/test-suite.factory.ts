import { nanoid } from "nanoid";
import {
  Component,
  Config,
  TestCaseSchema,
  TestSuite,
  TestSuiteData,
  TestSuiteElement,
  TestSuiteSchema,
  TestSuiteType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class TestSuiteFactory {
  static create(
    data: TestSuiteData,
    testedElement: Component,
    writeMethod: WriteMethod,
    config: Config
  ): TestSuite {
    const { id, name, endpoint, is_async, layer } = data;
    const testType = `${testedElement.type.component}_${data.type}`;
    const { defaults } = config.presets[testType];
    const componentName = config.presets[testType].generateName(name);
    const componentPath = config.presets[testType].generatePath({
      name,
      endpoint,
      layer,
    }).path;
    const tests = [];
    const imports = [];

    if (Array.isArray(defaults?.common?.tests)) {
      tests.push(...defaults.common.tests);
    }

    if (Array.isArray(defaults?.common?.imports)) {
      defaults.common.imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    const element = TestSuiteSchema.create<TestSuiteElement>({
      name,
      endpoint,
      type: testType,
      is_async: typeof is_async === "boolean" ? is_async : false,
    });

    const component = Component.create<TestSuiteElement>(config, {
      id: id || nanoid(),
      type: TestSuiteType.create(componentName, name, testType),
      endpoint,
      path: componentPath,
      writeMethod,
      element,
    });

    testedElement.element.methods.forEach((method) => {
      component.element.addTest(
        TestCaseSchema.create({
          group: { name: component.element.name, is_async: false },
          is_async: method.isAsync,
          name: method.name,
          methods: [method],
        })
      );
    });

    return component;
  }
}
