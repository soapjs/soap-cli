export const hasBody = (body: unknown) => {
  if (
    typeof body === "string" ||
    (body && typeof body === "object" && Object.keys(body).length > 0) ||
    (Array.isArray(body) && body.length > 0)
  ) {
    return true;
  }

  return false;
};

export const hasParams = (path: string) => {
  const [pathParams, queryParams] = path.split(/\s*\?\s*/);

  return /\:\w+/g.test(pathParams) && /\w+/g.test(queryParams);
};

// TODO: refactor

export const processBody = (input) => {
  function processProperty(key, value) {
    const type = Array.isArray(value) ? "array" : typeof value;
    let props = [];

    if (type === "object" && value !== null && !Array.isArray(value)) {
      props = Object.entries(value).map(([propKey, propValue]) => {
        return processProperty(propKey, propValue);
      });
    }

    if (type === "array" && value.length > 0) {

      const firstItem = value[0];
      if (typeof firstItem === "object" && !Array.isArray(firstItem)) {
        const itemProps = processBody([firstItem]);
        props = [{ type: "object", props: itemProps }];
      } else {
        props = [{ type: typeof firstItem, props: [] }];
      }
    }

    return { name: key, type, props };
  }

  const result = [];
  for (const [key, value] of Object.entries(input)) {
    result.push(processProperty(key, value));
  }

  return result;
}

// // Example usage:
// const input = {
//   model: {
//     id: "string",
//     category: "string",
//     coords: {
//       x: "number",
//       y: "number",
//       z: "number",
//     },
//   },
//   arenas: [
//     {
//       ground: "string",
//       size: "number",
//     },
//   ],
//   labels: ["string"],
// };

// console.log(processObject(input));
