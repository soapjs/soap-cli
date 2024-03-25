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
import { CreateHandlerIoWithRouteFrame } from "./frames/create-handler-io-with-route.frame";

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
        if (frame.output?.models) {
          result.models.push(...frame.output.models);
        }
        if (frame.output?.entities) {
          result.entities.push(...frame.output.entities);
        }
      } else if (frame.name === CreateRoutesForHandlersFrame.NAME) {
        if (frame.output?.routes) {
          result.routes.push(...frame.output.routes);
        }
        if (frame.output?.models) {
          result.models.push(...frame.output.models);
        }
        if (frame.output?.entities) {
          result.entities.push(...frame.output.entities);
        }
      } else if (frame.name === CreateControllerFrame.NAME) {
        if (frame.output?.controllers) {
          result.controllers.push(...frame.output.controllers);
        }
        if (frame.output?.models) {
          result.models.push(...frame.output.models);
        }
        if (frame.output?.entities) {
          result.entities.push(...frame.output.entities);
        }
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
      .addFrame(
        new CreateHandlerIoWithRouteFrame(config, texts),
        (t) => {
          const { name, endpoint } = t.getFrame(0).output;
          const { handlers, models, entities } = t.getFrame(1).output;
          const { routes } = t.getFrame(2).output;

          return {
            name,
            endpoint,
            handlers,
            models,
            entities,
            routes,
          };
        },
        (t) => {
          const { handlers } = t.getFrame(1).output;
          return handlers.length > 0;
        }
      )
      .addFrame(new CreateControllerFrame(config, command, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        const frame1 = t.getFrame(1).output;
        const frame3 = t.getFrame(3).output;
        const entities = [];
        const models = [];
        const handlers = [];

        if (Array.isArray(frame1.handlers)) {
          handlers.push(...frame1.handlers);
        }

        if (Array.isArray(frame3.handlers)) {
          handlers.push(...frame3.handlers);
        }

        if (Array.isArray(frame1.entities)) {
          entities.push(...frame1.entities);
        }

        if (Array.isArray(frame3.entities)) {
          entities.push(...frame3.entities);
        }

        if (Array.isArray(frame1.models)) {
          models.push(...frame1.models);
        }

        if (Array.isArray(frame3.models)) {
          models.push(...frame3.models);
        }

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
