import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import {
  CreateRouteFrame,
  DefineRouteNameAndEndpointFrame,
  DescribeRouteFrame,
  SelectRequestBodyTypeFrame,
  SelectResponseBodyTypeFrame,
} from "./frames";
import { DescribeControllerFrame } from "./frames/describe-controller.frame";
import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewRouteStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    const result = {
      models: [],
      entities: [],
      controllers: [],
      routes: [],
    };

    for (const frame of timeline) {
      if (frame.name === DescribeControllerFrame.NAME) {
        if (frame.output?.entities) {
          result.entities.push(...frame.output.entities);
        }
        if (frame.output?.models) {
          result.models.push(...frame.output.models);
        }
        if (frame.output?.controllers) {
          result.controllers.push(...frame.output.controllers);
        }
      } else if (frame.name === CreateRouteFrame.NAME) {
        if (frame.output?.routes) {
          result.routes.push(...frame.output.routes);
        }
      }
    }

    return result;
  }
}

export class NewRouteStoryboard extends Storyboard<any> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_route_storyboard",
      session ||
        new StoryboardSession("new_route_storyboard", localSessionPath),
      new NewRouteStoryResolver()
    );

    this.addFrame(new DefineRouteNameAndEndpointFrame(config, texts))
      .addFrame(new DescribeRouteFrame(config, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        return { name, endpoint };
      })
      .addFrame(new SelectRequestBodyTypeFrame(texts))
      .addFrame(new SelectResponseBodyTypeFrame(texts))
      .addFrame(new DescribeControllerFrame(config, command, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        const { controller, handler, path } = t.getFrame(1).output;
        const { request_body } = t.getFrame(2).output;
        const { response_body } = t.getFrame(3).output;
        return {
          name,
          endpoint,
          controller,
          handler,
          path,
          request_body,
          response_body,
        };
      })
      .addFrame(new CreateRouteFrame(config, command, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        const {
          path,
          http_method,
          controller,
          handler,
          auth,
          validate,
          cors,
          limiter,
        } = t.getFrame(1).output;
        const { request_body } = t.getFrame(2).output;
        const { response_body } = t.getFrame(3).output;

        return {
          name,
          endpoint,
          path,
          http_method,
          controller,
          handler,
          auth,
          validate,
          cors,
          limiter,
          request_body,
          response_body,
        };
      });
  }
}
