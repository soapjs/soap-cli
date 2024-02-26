import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { DefineResourcesFrame } from "./frames";
import { PluginMap, ProjectDescription, Texts } from "@soapjs/soap-cli-common";
import { localSessionPath } from "../../../api/common/consts";

export class InitResolver extends StoryResolver<ProjectDescription> {
  resolve(timeline: TimelineFrame[]): ProjectDescription {
    for (const frame of timeline) {
      if (frame.name === DefineResourcesFrame.NAME) {
        return frame.output;
      }
    }

    return null;
  }
}

export class InitStoryboard extends Storyboard<ProjectDescription> {
  constructor(texts: Texts, pluginMap: PluginMap, session?: StoryboardSession) {
    super(
      "new_controller_storyboard",
      session ||
        new StoryboardSession("new_controller_storyboard", localSessionPath),
      new InitResolver()
    );

    this.addFrame(new DefineResourcesFrame(pluginMap, texts));
  }
}
