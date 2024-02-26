export const setConfigValue = (obj: any, path: string, value: unknown) => {
  const keys = path.split(".");
  let currentObj = obj;

  for (let key of keys) {
    if (!currentObj.hasOwnProperty(key)) {
      currentObj[key] = {};
    }

    currentObj = currentObj[key];
  }

  const finalKey = keys[keys.length - 1];
  currentObj[finalKey] = value;
};

export const isValidConfigKey = (config: any, path: string) => {
  const keys = path.split(".");
  let current = config;

  for (let key of keys) {
    if (current[key] === undefined) {
      return false;
    }
  }

  return true;
};

export const getConfigValue = (obj: Object, path: string) => {
  const keys = path.split(".");
  let currentValue = obj;

  for (let key of keys) {
    if (currentValue.hasOwnProperty(key)) {
      currentValue = currentValue[key];
    }
  }

  return currentValue;
};
