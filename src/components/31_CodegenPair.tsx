import {
  Children,
  createContext,
  useContext,
} from "@alloy-js/core";
import { SourceFile } from "./23_SourceFile.js";

// Generic auto/manual file pairing for code generation.
// The auto file (_auto.rs) is regenerated every time -- protocol boilerplate.
// The stub file (.rs) is created once -- user-owned implementation.
// Any protocol layer (HTTP, gRPC, CLI, DB, events) uses this primitive.

// Context: how the auto file references the manual module
export const ImplPathContext = createContext<string>(undefined, "ImplPath");

export function useImplPath(): string {
  const path = useContext(ImplPathContext);
  if (!path) throw new Error("useImplPath() called outside a CodegenPair");
  return path;
}

// Wraps a file pair. Provides the implPath context so auto content
// can reference the manual module without hardcoding paths.
export interface CodegenPairProps {
  name: string;
  implPath: string;  // crate path to manual module, e.g. "crate::users::list_users"
  children: Children;
}

export function CodegenPair(props: CodegenPairProps) {
  return (
    <ImplPathContext.Provider value={props.implPath}>
      {props.children}
    </ImplPathContext.Provider>
  );
}

// SourceFile for the auto-generated half. Appends _auto to the name.
export interface AutoFileProps {
  name: string;
  externalUses?: string[];
  children: Children;
}

export function AutoFile(props: AutoFileProps) {
  return (
    <SourceFile path={props.name + "_auto.rs"} externalUses={props.externalUses}>
      {props.children}
    </SourceFile>
  );
}

// SourceFile for the user-owned stub half.
export interface StubFileProps {
  name: string;
  externalUses?: string[];
  children: Children;
}

export function StubFile(props: StubFileProps) {
  return (
    <SourceFile path={props.name + ".rs"} externalUses={props.externalUses}>
      {props.children}
    </SourceFile>
  );
}

// Renders a delegation call into the manual module.
// Uses ImplPathContext to resolve the crate path.
//
// <ImplCall fn="list_users_impl" args={["org_id"]} />
//   → crate::list_users::list_users_impl(org_id)
export interface ImplCallProps {
  fn: string;
  args?: string[];
}

export function ImplCall(props: ImplCallProps) {
  const implPath = useImplPath();
  const args = (props.args ?? []).join(", ");
  return <>{implPath}::{props.fn}({args})</>;
}
