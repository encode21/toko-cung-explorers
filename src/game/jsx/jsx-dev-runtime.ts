import type * as React from "react";
import { Fragment, jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
import type { Key, ReactNode, Ref } from "react";
import { cleanProps } from "./jsx-runtime";

type JsxProps = Record<string, unknown> & { key?: Key; ref?: Ref<unknown> };

export function jsxDEV(
  type: unknown,
  props: JsxProps,
  key: Key | undefined,
  isStaticChildren: boolean,
  source?: object,
  self?: unknown,
): ReactNode {
  return _jsxDEV(
    type as never,
    cleanProps(type, props) as never,
    key,
    isStaticChildren,
    source,
    self,
  );
}

export { Fragment };

export namespace JSX {
  export type ElementType = React.JSX.ElementType;
  export interface Element extends React.JSX.Element {}
  export interface ElementClass extends React.JSX.ElementClass {}
  export interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
  export interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
  export type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  export interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
  export interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
  export interface IntrinsicElements extends React.JSX.IntrinsicElements {}
}
