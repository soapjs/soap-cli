import {
  StoryResolver,
  Storyboard,
  StoryboardSession,
  TimelineFrame,
} from "@soapjs/soap-cli-interactive";
import { CreateMappersFrame, SelectMapperStoragesFrame } from "./frames";
import { ApiJson, Config, Texts } from "@soapjs/soap-cli-common";
import { localSessionPath } from "../../common/consts";
import { CommandConfig, WriteMethodResolver } from "../../../../core";

export class NewMapperStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateMappersFrame.NAME && frame.output) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
      mappers: [],
    };
  }
}

export class NewMapperStoryboard extends Storyboard<ApiJson> {
  constructor(
    texts: Texts,
    config: Config,
    command: CommandConfig,
    session?: StoryboardSession
  ) {
    super(
      "new_mapper_storyboard",
      session ||
        new StoryboardSession("new_mapper_storyboard", localSessionPath),
      new NewMapperStoryResolver()
    );

    const writeMethods = WriteMethodResolver.resolveWriteMethods(command);

    this.addFrame(new SelectMapperStoragesFrame(config, texts)).addFrame(
      new CreateMappersFrame(config, command, writeMethods, texts),
      (t) => ({ storages: t.prevFrame.output })
    );
  }
}
