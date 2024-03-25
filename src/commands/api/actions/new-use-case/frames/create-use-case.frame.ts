import { existsSync } from "fs";
import {
  InputNameAndEndpointInteraction,
  InputTextInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { CreateEntityFrame } from "../../new-entity";
import { CreateModelsFrame } from "../../new-model";
import { pascalCase } from "change-case";
import { CreateParamsInteraction } from "../../../common/interactions/create-params.interaction";
import {
  ApiJson,
  Config,
  ParamJson,
  Texts,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";

export class CreateUseCaseFrame extends Frame<ApiJson> {
  public static NAME = "create_use_case_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateUseCaseFrame.NAME);
  }

  public async run(context?: { name?: string; endpoint?: string }) {
    const { texts, config, command } = this;
    const result: ApiJson = { entities: [], models: [], use_cases: [] };
    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_use_case_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.presets.model.isEndpointRequired(),
    });
    const output_choices = [
      { name: "None", value: "None" },
      { name: "Entity", value: "Entity" },
      { name: "Model", value: "Model" },
      { name: "Other", value: "Other" },
    ];
    let writeMethod = WriteMethod.Write;
    let res: ApiJson;
    let output;
    const input = new Set<ParamJson>();
    const componentName = config.presets.use_case.generateName(name);
    const componentPath = config.presets.use_case.generatePath({
      name,
      endpoint,
    }).path;

    if (command.force === false) {
      if (existsSync(componentPath)) {
        writeMethod = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (writeMethod !== WriteMethod.Skip) {
      if (
        await InteractionPrompts.confirm(
          texts.get("does_the_use_case_have_an_input")
        )
      ) {
        console.log(chalk.gray(texts.get("option_use_case_input")));
        const { params, ...deps } = await new CreateParamsInteraction(
          texts,
          config,
        ).run(
          {
            endpoint,
            target: "use case",
          },
          { skipQuestion: true }
        );

        params.forEach((p) => input.add(p));
        result.entities.push(...deps.entities);
        result.models.push(...deps.models);
      }

      const cat = await InteractionPrompts.select<string>(
        texts.get("what_type_of_data_does_the_use_case_return"),
        output_choices
      );

      if (cat === "Entity") {
        res = await new CreateEntityFrame(config, command, texts).run({
          name: pascalCase(`${name} Output`),
          endpoint,
        });
        output = `Entity<${res.entities.at(-1).name}>`;
      } else if (cat === "Model") {
        res = await new CreateModelsFrame(config, command, texts).run({
          name: pascalCase(`${name} Output`),
          types: ["json"],
          endpoint,
        });
        output = `Model<${res.models.at(-1).name}>`;
      } else if (cat === "Other") {
        const o = await new InputTextInteraction(
          texts.get("please_enter_use_case_output")
        ).run();
        const type = TypeInfo.create(o, config);
        output = type.tag;
      } else {
        output = "void";
      }

      if (Array.isArray(res?.entities)) {
        result.entities.push(...res.entities);
      }

      if (Array.isArray(res?.models)) {
        result.models.push(...res.models);
      }

      result.use_cases.push({
        name,
        endpoint,
        input: [...input],
        output,
      });
    }

    return result;
  }
}
