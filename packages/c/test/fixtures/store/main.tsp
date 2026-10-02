import "../../../../sql/lib/main.tsp";
using Entity;
namespace Fixture;
model Entry {
  @pk id: int64;
  note: string | null;
  score: float64;
}
