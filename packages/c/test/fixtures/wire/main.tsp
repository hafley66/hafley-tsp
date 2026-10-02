namespace Fixture;
enum State { `in-progress`, done }
model Labels is Record<string[]>;
model Message { text: string; state: State; code: int64 | null; labels: string[]; extra?: Labels; dynamic?: unknown; }
union Event { message: Message, empty: null }
