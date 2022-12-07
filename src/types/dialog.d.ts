// TODO: when there's a something on generic type, then add it to property type.
// export interface DialogReturnType {
//   action: string;
// }
export interface DialogConfig {
  dialogName?: string;
}

export type DialogReturnType<T> = T;
