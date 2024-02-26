import { TypeInfo } from "../type.info";

export class ComponentTools {
  static filterComponentTypes(type: TypeInfo): TypeInfo[] {
    if (TypeInfo.isComponentType(type)) {
      return [type];
    }

    if (TypeInfo.isArray(type) || TypeInfo.isSet(type)) {
      return ComponentTools.filterComponentTypes(type.itemType);
    }

    if (TypeInfo.isMap(type)) {
      return [
        ...ComponentTools.filterComponentTypes(type.keyType),
        ...ComponentTools.filterComponentTypes(type.valueType),
      ];
    }

    if (TypeInfo.isMultiType(type)) {
      return type.chain.reduce((list, c) => {
        if (TypeInfo.isType(c)) {
          list.push(...ComponentTools.filterComponentTypes(c));
        }
        return list;
      }, []);
    }

    return [];
  }
}
