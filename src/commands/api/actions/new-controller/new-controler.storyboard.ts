import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import {
  CreateControllerFrame,
  CreateRoutesForHandlersFrame,
  DefineControllerHandlersFrame,
  DefineControllerNameAndEndpointFrame,
} from "./frames";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewControllerResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    const result = {
      models: [],
      entities: [],
      controllers: [],
      routes: [],
    };

    for (const frame of timeline) {
      if (frame.name === DefineControllerHandlersFrame.NAME) {
        result.models.push(...frame.output.models);
        result.entities.push(...frame.output.entities);
      } else if (frame.name === CreateRoutesForHandlersFrame.NAME) {
        result.routes.push(...frame.output.routes);
        result.models.push(...frame.output.models);
        result.entities.push(...frame.output.entities);
      } else if (frame.name === CreateControllerFrame.NAME) {
        result.controllers.push(...frame.output.controllers);
        result.models.push(...frame.output.models);
        result.entities.push(...frame.output.entities);
      }
    }

    return result;
  }
}

export class NewControllerStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_controller_storyboard",
      session ||
        new StoryboardSession("new_controller_storyboard", localSessionPath),
      new NewControllerResolver()
    );

    this.addFrame(new DefineControllerNameAndEndpointFrame(config, texts))
      .addFrame(
        new DefineControllerHandlersFrame(config, command, texts),
        (t) => {
          const { name, endpoint } = t.getFrame(0).output;
          return { name, endpoint };
        }
      )
      .addFrame(
        new CreateRoutesForHandlersFrame(config, texts),
        (t) => {
          const { name, endpoint } = t.getFrame(0).output;
          const { handlers, models, entities } = t.getFrame(1).output;

          return {
            name,
            endpoint,
            handlers,
            models,
            entities,
          };
        },
        (t) => {
          const { handlers } = t.getFrame(1).output;
          return handlers.length > 0;
        }
      )
      .addFrame(new CreateControllerFrame(config, command, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        const { handlers, models, entities } = t.getFrame(1).output;

        return {
          name,
          endpoint,
          handlers,
          entities,
          models,
        };
      });
  }
}
