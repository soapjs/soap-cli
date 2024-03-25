import { PluginMap, ProjectDescription, Texts } from "@soapjs/soap-cli-common";
import { DefineProjectFrame } from "./frames";
import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../../api/common/consts";

export class NewProjectResolver extends StoryResolver<ProjectDescription> {
  resolve(timeline: TimelineFrame[]): ProjectDescription {
    for (const frame of timeline) {
      if (frame.name === DefineProjectFrame.NAME) {
        return frame.output;
      }
    }

    return null;
  }
}

export class NewProjectStoryboard extends Storyboard<ProjectDescription> {
  constructor(texts: Texts, pluginMap: PluginMap, session?: StoryboardSession) {
    super(
      "new_controller_storyboard",
      session ||
        new StoryboardSession("new_controller_storyboard", localSessionPath),
      new NewProjectResolver()
    );

    this.addFrame(new DefineProjectFrame(pluginMap, texts));
  }
}
