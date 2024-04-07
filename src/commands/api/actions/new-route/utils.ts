const httpMethodsMapping = {
  // GET
  get: "GET",
  list: "GET",
  find: "GET",
  fetch: "GET",
  read: "GET",
  query: "GET",
  // POST
  add: "POST",
  create: "POST",
  new: "POST",
  submit: "POST",
  insert: "POST",
  login: "POST",
  logout: "POST",
  register: "POST",
  signUp: "POST",
  signIn: "POST",
  authorize: "POST",
  validate: "POST",
  verify: "POST",
  authenticate: "POST",
  // PUT
  update: "PUT",
  modify: "PUT",
  change: "PUT",
  edit: "PUT",
  // DELETE
  remove: "DELETE",
  delete: "DELETE",
  erase: "DELETE",
  patch: "PATCH",
  adjust: "PATCH",
  revise: "PATCH",
};

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
};

export const generateRouteDetails = (routeName: string) => {
  let action = "get";
  let defaultHttpMethod = "GET";

  Object.keys(httpMethodsMapping).forEach((key) => {
    if (routeName.toLowerCase().startsWith(key)) {
      action = key;
      defaultHttpMethod = httpMethodsMapping[key];
    }
  });

  let handlerName = routeName.charAt(0).toLowerCase() + routeName.slice(1);
  if (
    !Object.keys(httpMethodsMapping).some((prefix) =>
      handlerName.toLowerCase().startsWith(prefix)
    )
  ) {
    handlerName = `${action}${handlerName
      .charAt(0)
      .toUpperCase()}${handlerName.slice(1)}`;
  }

  return {
    httpMethod: defaultHttpMethod,
    handlerName,
  };
};
