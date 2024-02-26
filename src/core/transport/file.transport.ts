import { Transport, TransportOptions, TransportStatus } from "./transport";
import fs from "fs";
import { ensurePathExists, fileOrDirExists } from "../tools/files.tools";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class FileTransport implements Transport {
  writeOutput(data: string, options: FileTransportOptions): TransportStatus {
    const { outputPath, write_method } = options;
    try {
      if (write_method === WriteMethod.Skip) {
        return "skipped";
      }

      const exists = fileOrDirExists(outputPath);
      ensurePathExists(outputPath);
      fs.writeFileSync(outputPath, data);

      return exists ? "modified" : data.length === 0 ? "blank" : "created";
    } catch (error) {
      console.log(error);
      return "error";
    }
  }
}

interface FileTransportOptions extends TransportOptions {
  outputPath: string;
  write_method?: WriteMethod;
}
