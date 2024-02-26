import { Texts, ensurePathExists } from "@soapjs/soap-cli-common";
import { writeFile } from "fs/promises";
import path from "path";
import TextsJson from "../../../defaults/texts.json";
import { existsSync } from "fs";

export class TextsService {
  private localPath: string;
  constructor(localPath: string) {
    this.localPath = path.join(process.cwd(), localPath);
  }

  async sync(): Promise<Texts> {
    ensurePathExists(this.localPath);
    await writeFile(
      this.localPath,
      JSON.stringify(TextsJson, null, 2),
      "utf-8"
    );
    return Texts.load(this.localPath);
  }
}
