import { parentPort } from "worker_threads";

export const workerLog = (...data: any[]) => {
  const logs = [];
  data.forEach((d) => {
    logs.push(typeof d === "object" ? JSON.stringify(d, null, 2) : d);
  });
  parentPort.postMessage({ status: "log", data: logs.join(" ") });
};
