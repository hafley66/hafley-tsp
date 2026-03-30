using TypeSpec.Reflection;

namespace Sync {
  /** How this entity gets written to storage.
   *  - "upsert": INSERT ON CONFLICT DO UPDATE (default)
   *  - "insert-ignore": INSERT OR IGNORE
   *  - "delete-replace": DELETE all for parent FK, then INSERT each */
  extern dec strategy(target: Model, value: valueof string);
}
