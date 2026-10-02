namespace Probe;
scalar Id extends int64;
scalar Label extends string;
enum State { active: "active", inactive: "inactive" }
model Item { id: Id; label: Label; state: State; note?: string; }
union Result { item: Item, text: string, count: int64, empty: null }
interface Store { read(id: Id): Item; count(): int64; }
