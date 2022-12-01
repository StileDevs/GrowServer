export interface ActionConfig {
  eventName?: string;
}

// TODO: when there's a something on generic type, then add it to property type.
export interface ActionDefault {
  action: string;
}
export type ActionType<T> = T;
