import type * as React from "react";
import { Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import type { Key, ReactNode, Ref } from "react";

/**
 * JSX runtime khusus scene 3D.
 *
 * Tooling editor menyuntik atribut sumber (`data-tsd-source`, `data-ln`, dst.)
 * ke setiap elemen JSX. React Three Fiber memperlakukan prop bertanda `-`
 * sebagai path bertingkat, sehingga `data-ln` dibaca sebagai `object.data.ln`
 * dan melempar "R3F: Cannot set ...". Runtime ini membuang atribut tersebut
 * sebelum sampai ke R3F.
 */
const DATA_KEYS = new Set(["data-tsd-source", "data-source-file", "data-ln"]);

type JsxProps = Record<string, unknown> & { key?: Key; ref?: Ref<unknown> };

export function cleanProps(type: unknown, props: JsxProps | null): JsxProps | null {
  if (!props || typeof type !== "string") return props;
  let changed = false;
  const next: JsxProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (DATA_KEYS.has(key) || key.startsWith("data-lovable") || key.startsWith("data-tsd")) {
      changed = true;
      continue;
    }
    next[key] = value;
  }
  return changed ? next : props;
}

export function jsx(type: unknown, props: JsxProps, key?: Key): ReactNode {
  return _jsx(type as never, cleanProps(type, props) as never, key);
}

export function jsxs(type: unknown, props: JsxProps, key?: Key): ReactNode {
  return _jsxs(type as never, cleanProps(type, props) as never, key);
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
