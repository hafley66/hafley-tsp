namespace Fixture;
enum State { `in-progress`, done }
model Message { text: string; state: State; code: int64 | null; labels: string[]; }
union Event { message: Message, empty: null }
