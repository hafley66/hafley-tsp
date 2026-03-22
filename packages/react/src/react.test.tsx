import { describe, expect, it } from "vitest";
import { createTester } from "@typespec/compiler/testing";
import { resolvePath } from "@typespec/compiler";
import type { Model, Union, Namespace } from "@typespec/compiler";
import { emitReactApp } from "./03_emit-app.js";
import { extractRoutes } from "./01_extract-routes.js";
import type { ComponentDef } from "./00_types.js";

const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [],
});

function findFile(node: any, path: string): any {
  for (const item of node.contents) {
    if (item.kind === "file" && item.path === path) return item;
    if (item.kind === "directory") {
      const found = findFile(item, path);
      if (found) return found;
    }
  }
  return null;
}

function getModel(ns: Namespace, name: string): Model {
  const m = ns.models.get(name);
  if (!m) throw new Error(`Model "${name}" not found`);
  return m;
}

function getUnion(ns: Namespace, name: string): Union {
  const u = ns.unions.get(name);
  if (!u) throw new Error(`Union "${name}" not found`);
  return u;
}

describe("React component emitter", () => {
  it("emits a Counter component", async () => {
    const { program } = await Tester.compile(`
      model CounterState {
        count: int32 = 0;
      }

      model Increment {
        amount: int32 = 1;
      }

      model Decrement {}

      model Reset {}

      union CounterEvent {
        increment: Increment;
        decrement: Decrement;
        reset: Reset;
      }
    `);

    const ns = program.getGlobalNamespaceType();
    const def: ComponentDef = {
      name: "Counter",
      state: getModel(ns, "CounterState"),
      events: getUnion(ns, "CounterEvent"),
    };

    const res = emitReactApp({ packageName: "test-app", components: [def], program });
    const file = findFile(res, "Counter.tsx");
    expect(file).not.toBeNull();
    expect(file.contents).toMatchSnapshot();
  });

  it("emits a PostEditor component", async () => {
    const { program } = await Tester.compile(`
      model PostEditorState {
        title: string = "";
        body: string = "";
        dirty: boolean = false;
        tags: string[];
      }

      model UpdateTitle {
        value: string;
      }

      model UpdateBody {
        value: string;
      }

      model ToggleDirty {}

      model Save {}

      union PostEditorEvent {
        updateTitle: UpdateTitle;
        updateBody: UpdateBody;
        toggleDirty: ToggleDirty;
        save: Save;
      }
    `);

    const ns = program.getGlobalNamespaceType();
    const def: ComponentDef = {
      name: "PostEditor",
      state: getModel(ns, "PostEditorState"),
      events: getUnion(ns, "PostEditorEvent"),
    };

    const res = emitReactApp({ packageName: "test-app", components: [def], program });
    const file = findFile(res, "PostEditor.tsx");
    expect(file).not.toBeNull();
    expect(file.contents).toMatchSnapshot();
  });

  it("emits multiple components in one app", async () => {
    const { program } = await Tester.compile(`
      model CounterState { count: int32 = 0; }
      model Increment { amount: int32 = 1; }
      model Decrement {}
      model Reset {}
      union CounterEvent {
        increment: Increment;
        decrement: Decrement;
        reset: Reset;
      }

      model FormState { name: string = ""; }
      model SetName { value: string; }
      union FormEvent { setName: SetName; }
    `);

    const ns = program.getGlobalNamespaceType();

    const counter: ComponentDef = {
      name: "Counter",
      state: getModel(ns, "CounterState"),
      events: getUnion(ns, "CounterEvent"),
    };
    const form: ComponentDef = {
      name: "Form",
      state: getModel(ns, "FormState"),
      events: getUnion(ns, "FormEvent"),
    };

    const res = emitReactApp({
      packageName: "test-app",
      components: [counter, form],
      program,
    });

    expect(findFile(res, "Counter.tsx")).not.toBeNull();
    expect(findFile(res, "Form.tsx")).not.toBeNull();
  });
});

describe("TanStack Router route emitter", () => {
  it("emits route files from AppRoutes model", async () => {
    const { program } = await Tester.compile(`
      model Signal<T> { value: T; }
      model Component<TProps, TState, TEvents> {
        props: TProps;
        state: TState;
        events: TEvents;
      }
      model Route<TComponent> {
        component: TComponent;
      }

      model DashboardState {
        widgets: string[];
      }
      model RefreshWidgets {}
      union DashboardEvent {
        refresh: RefreshWidgets;
      }

      model UserDetailState {
        editing: boolean;
      }
      model ToggleEdit {}
      model SaveUser { name: string; }
      union UserDetailEvent {
        toggleEdit: ToggleEdit;
        save: SaveUser;
      }

      model AppRoutes {
        "/": Route<Component<{}, DashboardState, DashboardEvent>>;
        "/users/$userId": Route<Component<{}, UserDetailState, UserDetailEvent>>;
      }
    `);

    const ns = program.getGlobalNamespaceType();
    const appRoutes = getModel(ns, "AppRoutes");
    const routes = extractRoutes(appRoutes);

    expect(routes).toHaveLength(2);
    expect(routes[0].path).toBe("/");
    expect(routes[0].fileName).toBe("index");
    expect(routes[1].path).toBe("/users/$userId");
    expect(routes[1].fileName).toBe("users.$userId");

    const res = emitReactApp({
      packageName: "test-app",
      routes,
      program,
    });

    const indexFile = findFile(res, "routes/index.tsx");
    expect(indexFile).not.toBeNull();
    expect(indexFile.contents).toMatchSnapshot();

    const userFile = findFile(res, "routes/users.$userId.tsx");
    expect(userFile).not.toBeNull();
    expect(userFile.contents).toMatchSnapshot();
  });

  it("extracts correct component names from state models", async () => {
    const { program } = await Tester.compile(`
      model Component<TProps, TState, TEvents> {
        props: TProps;
        state: TState;
        events: TEvents;
      }
      model Route<TComponent> {
        component: TComponent;
      }

      model SettingsPageState { theme: string; }
      model ChangeTheme { theme: string; }
      union SettingsPageEvent { changeTheme: ChangeTheme; }

      model AppRoutes {
        "/settings": Route<Component<{}, SettingsPageState, SettingsPageEvent>>;
      }
    `);

    const ns = program.getGlobalNamespaceType();
    const routes = extractRoutes(getModel(ns, "AppRoutes"));

    expect(routes[0].componentName).toBe("SettingsPage");
    expect(routes[0].fileName).toBe("settings");
  });
});
