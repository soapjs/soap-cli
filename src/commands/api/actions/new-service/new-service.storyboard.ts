import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../core";
import { ApiJson } from "../../common/api.types";
import { CreateServiceFrame } from "./frames";
import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";

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
  constructor(texts: Texts, config: Config, session?: StoryboardSession) {
    super(
      "new_service_storyboard",
      session ||
        new StoryboardSession("new_service_storyboard", localSessionPath),
      new NewServiceStoryResolver()
    );

    this.addFrame(new CreateServiceFrame(config, texts));
  }
}
