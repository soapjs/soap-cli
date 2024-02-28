import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { CreateModelsFrame } from "./frames";
import { SelectModelTypesFrame } from "./frames/select-model-types.frame";
import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewModelStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateModelsFrame.NAME) {
        return frame.output;
      }
    }

    return {
      models: [],
    };
  }
}

export class NewModelStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_model_storyboard",
      session ||
        new StoryboardSession("new_model_storyboard", localSessionPath),
      new NewModelStoryResolver()
    );

    this.addFrame(new SelectModelTypesFrame(config, texts)).addFrame(
      new CreateModelsFrame(config, command, texts),
      (t) => ({ types: t.prevFrame.output })
    );
  }
}
