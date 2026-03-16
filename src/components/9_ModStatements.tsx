import { computed, For, memo } from "@alloy-js/core";

export interface ModStatementsProps {
  mods: Set<string>;
}

export function ModStatements(props: ModStatementsProps) {
  const statements = computed(() => {
    return [...props.mods].sort();
  });

  return memo(() => {
    if (statements.value.length === 0) return null;
    return (
      <For each={statements.value} joiner={<><hbr /></>}>
        {(name: string) => <>pub mod {name};</>}
      </For>
    );
  });
}
