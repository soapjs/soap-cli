import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { CreateToolsetFrame, SelectToolsetlayerFrame } from "./frames";
import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";
import { CommandConfig, WriteMethodResolver } from "../../../../core";

export class NewToolsetStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateToolsetFrame.NAME && frame.output) {
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
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_toolset_storyboard",
      session ||
        new StoryboardSession("new_toolset_storyboard", localSessionPath),
      new NewToolsetStoryResolver()
    );

    const writeMethods = WriteMethodResolver.resolveWriteMethods(command);

    this.addFrame(new SelectToolsetlayerFrame(config, texts)).addFrame(
      new CreateToolsetFrame(config, command, writeMethods, texts),
      (t) => ({ layer: t.prevFrame.output })
    );
  }
}
