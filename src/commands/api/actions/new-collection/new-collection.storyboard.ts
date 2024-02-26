import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { Config } from "../../../../core";
import { ApiJson } from "../../common/api.types";
import { CreateCollectionFrame, SelectCollectionStoragesFrame } from "./frames";
import { Texts } from "@soapjs/soap-cli-common";
import { localSessionPath } from "../../common/consts";

export class NewCollectionStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateCollectionFrame.NAME) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
      collections: [],
    };
  }
}

export class NewCollectionStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,

    session?: StoryboardSession
  ) {
    super(
      "new_collection_storyboard",
      session ||
        new StoryboardSession("new_collection_storyboard", localSessionPath),
      new NewCollectionStoryResolver()
    );

    this.addFrame(new SelectCollectionStoragesFrame(config, texts)).addFrame(
      new CreateCollectionFrame(config, texts),
      (t) => ({ storages: t.prevFrame.output })
    );
  }
}
