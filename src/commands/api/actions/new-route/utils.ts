export const hasBody = (body: unknown) => {
  if (
    typeof body === "string" ||
    (!!body && typeof body === "object" && Object.keys(body).length > 0) ||
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
