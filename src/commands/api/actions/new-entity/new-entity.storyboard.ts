import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { CreateEntityFrame } from "./frames";
import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewEntityStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateEntityFrame.NAME) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
    };
  }
}

export class NewEntityStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_entity_storyboard",
      session ||
        new StoryboardSession("new_entity_storyboard", localSessionPath),
      new NewEntityStoryResolver()
    );

    this.addFrame(new CreateEntityFrame(config, command, texts));
  }
}
