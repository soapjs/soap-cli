#!/usr/bin/env node

import { runProgram } from "./soap.commands";
import * as Config from "./defaults/root.config.json";
import { TextsService } from "./core";

const start = async () => {
  try {
    const texts = await new TextsService(Config.local_texts_path).sync();
    runProgram(texts);
  } catch (error) {
    console.log(error);
  }
};

start();
