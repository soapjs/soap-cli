import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import {
  CreateCollectionFrame,
  DefineCollectionNameAndEndpointFrame,
  SelectCollectionStoragesFrame,
} from "./frames";
import { Texts, Config, ApiJson } from "@soapjs/soap-cli-common";
import { localSessionPath } from "../../common/consts";
import { CommandConfig } from "../../../../core";

export class NewCollectionStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateCollectionFrame.NAME && frame.output) {
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
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_collection_storyboard",
      session ||
        new StoryboardSession("new_collection_storyboard", localSessionPath),
      new NewCollectionStoryResolver()
    );

    this.addFrame(new SelectCollectionStoragesFrame(config, texts))
      .addFrame(new DefineCollectionNameAndEndpointFrame(config, texts))
      .addFrame(new CreateCollectionFrame(config, command, texts), (t) => {
        const { name, endpoint } = t.prevFrame.output;
        return {
          types: t.getFrame(0).output,
          name,
          endpoint,
        };
      });
  }
}
