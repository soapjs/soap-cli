import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { CreateServiceFrame } from "./frames";
import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewServiceStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateServiceFrame.NAME) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
      services: [],
    };
  }
}

export class NewServiceStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_service_storyboard",
      session ||
        new StoryboardSession("new_service_storyboard", localSessionPath),
      new NewServiceStoryResolver()
    );

    this.addFrame(new CreateServiceFrame(config, command, texts));
  }
}
