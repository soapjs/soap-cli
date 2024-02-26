import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../core";
import { ApiJson } from "../../common/api.types";
import { CreateModelsFrame } from "./frames";
import { SelectModelTypesFrame } from "./frames/select-model-types.frame";
import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { localSessionPath } from "../../common/consts";

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
  constructor(texts: Texts, config: Config, session?: StoryboardSession) {
    super(
      "new_model_storyboard",
      session ||
        new StoryboardSession("new_model_storyboard", localSessionPath),
      new NewModelStoryResolver()
    );

    this.addFrame(new SelectModelTypesFrame(config, texts)).addFrame(
      new CreateModelsFrame(config, texts),
      (t) => ({ types: t.prevFrame.output })
    );
  }
}
