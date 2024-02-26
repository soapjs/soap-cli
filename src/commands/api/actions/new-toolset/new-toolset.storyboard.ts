import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../core";
import { ApiJson } from "../../common/api.types";
import { CreateToolsetFrame, SelectToolsetlayerFrame } from "./frames";
import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";

export class NewToolsetStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateToolsetFrame.NAME) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
      toolsets: [],
    };
  }
}

export class NewToolsetStoryboard extends Storyboard<ApiJson> {
  constructor(texts: Texts, config: Config, session?: StoryboardSession) {
    super(
      "new_toolset_storyboard",
      session ||
        new StoryboardSession("new_toolset_storyboard", localSessionPath),
      new NewToolsetStoryResolver()
    );

    this.addFrame(new SelectToolsetlayerFrame(config, texts)).addFrame(
      new CreateToolsetFrame(config, texts),
      (t) => ({ layer: t.prevFrame.output })
    );
  }
}
