import {
  Children,
  computed,
  createContext,
  For,
  memo,
  shallowReactive,
  useContext,
} from "@alloy-js/core";

// A zone registry maps zone names to reactive arrays of content.
// Child components push content into named zones, and Zone components
// render the collected content wherever they appear in the tree.
type ZoneEntries = Children[];
type ZoneRegistry = Map<string, ZoneEntries>;

export const ZoneRegistryContext = createContext<ZoneRegistry>(undefined, "ZoneRegistry");

export function ZoneProvider(props: { children: Children }) {
  const registry: ZoneRegistry = new Map();
  return (
    <ZoneRegistryContext.Provider value={registry}>
      {props.children}
    </ZoneRegistryContext.Provider>
  );
}

function getOrCreateZone(registry: ZoneRegistry, name: string): ZoneEntries {
  if (!registry.has(name)) {
    registry.set(name, shallowReactive([]));
  }
  return registry.get(name)!;
}

// Renders all content that has been appended to this zone.
export interface ZoneProps {
  name: string;
  joiner?: Children;
}

export function Zone(props: ZoneProps) {
  const registry = useContext(ZoneRegistryContext)!;
  const items = getOrCreateZone(registry, props.name);

  const content = computed(() => [...items]);

  return memo(() => {
    if (content.value.length === 0) return null;
    return (
      <For each={content.value} joiner={props.joiner ?? null}>
        {(item: Children) => <>{item}</>}
      </For>
    );
  });
}

// Teleports children into a named zone. Renders nothing at its location.
export interface AppendToProps {
  zone: string;
  children: Children;
}

export function AppendTo(props: AppendToProps) {
  const registry = useContext(ZoneRegistryContext)!;
  const items = getOrCreateZone(registry, props.zone);
  items.push(props.children);
  return null;
}
