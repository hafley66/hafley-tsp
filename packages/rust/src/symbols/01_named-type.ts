import {
  createSymbol,
  Namekey,
  OutputSpace,
  track,
  TrackOpTypes,
  trigger,
  TriggerOpTypes,
} from "@alloy-js/core";
import { RustSymbol, RustSymbolOptions } from "./00_rust.js";

export type RustTypeKind =
  | "type"        // generic, pre-specialization
  | "struct"
  | "enum"
  | "trait"
  | "field"
  | "enum-variant"
  | "module";

export interface RustNamedTypeSymbolOptions extends RustSymbolOptions {}

export class RustNamedTypeSymbol extends RustSymbol {
  public static readonly memberSpaces = ["members"];

  #typeKind: RustTypeKind;

  constructor(
    name: string | Namekey,
    spaces: OutputSpace[] | OutputSpace | undefined,
    kind: RustTypeKind,
    options: RustNamedTypeSymbolOptions = {},
  ) {
    super(name, spaces, options);
    this.#typeKind = kind;
  }

  get typeKind(): RustTypeKind {
    track(this, TrackOpTypes.GET, "typeKind");
    return this.#typeKind;
  }

  set typeKind(value: RustTypeKind) {
    const old = this.#typeKind;
    if (old === value) return;
    this.#typeKind = value;
    trigger(this, TriggerOpTypes.SET, "typeKind", value, old);
  }

  get members() {
    return this.memberSpaceFor("members")!;
  }

  copy(): OutputSymbol {
    const copy = createSymbol(
      RustNamedTypeSymbol,
      this.name,
      undefined,
      this.#typeKind,
      { ...this.getRustCopyOptions(), binder: this.binder },
    );
    this.initializeRustCopy(copy);
    return copy;
  }
}
