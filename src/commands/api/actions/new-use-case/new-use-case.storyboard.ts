import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { CreateUseCaseFrame } from "./frames";
import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewUseCaseStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateUseCaseFrame.NAME && frame.output) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
      use_cases: [],
    };
  }
}

export class NewUseCaseStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_use_case_storyboard",
      session ||
        new StoryboardSession("new_use_case_storyboard", localSessionPath),
      new NewUseCaseStoryResolver()
    );

    this.addFrame(new CreateUseCaseFrame(config, command, texts));
  }
}
