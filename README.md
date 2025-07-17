# reorder

[![CI](https://github.com/thaitype/reorder/actions/workflows/main.yml/badge.svg)](https://github.com/thaitype/reorder/actions/workflows/main.yml) [![codecov](https://codecov.io/gh/thaitype/reorder/graph/badge.svg?token=B7MCHM57BH)](https://codecov.io/gh/thaitype/reorder) [![NPM Version](https://img.shields.io/npm/v/reorder) ](https://www.npmjs.com/package/reorder)[![npm downloads](https://img.shields.io/npm/dt/reorder)](https://www.npmjs.com/reorder) 

## Reorder Function — Design Specification

### Purpose

Create a **pure function** (class or standalone) that computes the correct `"order"` field for a list of items when one is moved to a new position, without any DB or UI dependencies. This supports chapters, lessons, or sublessons—all using the `{ id, order? }` structure.

---

### Key Principles

* **Pure logic:** No database, no side effects.
* **Unit-testable:** Supports table-driven tests.
* **Order field is primary:** All computations are based on the `"order"` field, not array index.
* **Sorted context:** The `targetIndex` always refers to the position in the **sorted** order of items (ascending by `"order"`).

---

### Input

* **items:** `OrderableItem[]`
  Array of items (`{ id: string, order?: number }`). Input may be unsorted.
* **moveId:** `string`
  The `id` of the item to move.
* **targetIndex:** `number`
  The intended index **in the sorted list** (0 = first).

---

### Algorithm

1. **Sort items** by `"order"` ascending (undefined orders are handled explicitly—either last or first, as documented).
2. **Remove** the item with `moveId` from its position.
3. **Insert** the item at `targetIndex` in the sorted array.
4. **Compute new `"order"`:**

   * If both neighbors exist: use the midpoint between their `"order"` values.
   * If only previous: previous `"order"` + 1.
   * If only next: next `"order"` - 1.
   * If list is empty: assign 1.
5. **Detect tight gaps:**
   If order values become too close due to repeated insertions, renumber all orders with even gaps (e.g., 10, 20, 30, ...).
6. **Determine changes:**
   Only return items whose `"order"` field actually needs updating.

---

### Output

* **changes:**
  `Array<{ id: string, order: number }>`
  Minimal set of changes for DB persistence.
* **orderedItems:**
  `OrderableItem[]`
  The full array of items, sorted by their new `"order"` (for UI/state reference).

---

### Function Signature (TypeScript)

```typescript
function reorderItems(
  items: OrderableItem[],
  moveId: string,
  targetIndex: number
): {
  changes: { id: string; order: number }[];
  orderedItems: OrderableItem[];
}
```

---

### Edge Case Handling

* Handles missing, undefined, or duplicate `"order"` fields (with documented behavior).
* Moving to start or end of list.
* Handles input arrays that are not initially sorted.
* Throws error or returns no-op if `moveId` not found.

---

### Example

**Input:**

```js
[
  { id: 'A', order: 700 },
  { id: 'B', order: 200 },
  { id: 'C', order: 300 },
  { id: 'D', order: 100 },
  { id: 'E', order: 400 }
]
```

Move `'X'` to `targetIndex: 1`.

**After sorting:**
`[100, 200, 300, 400, 700]` → Insert X at index 1 (`order = 150`).

**Output:**

```js
{
  changes: [{ id: 'X', order: 150 }],
  orderedItems: [
    { id: 'D', order: 100 },
    { id: 'X', order: 150 },
    { id: 'B', order: 200 },
    { id: 'C', order: 300 },
    { id: 'E', order: 400 },
    { id: 'A', order: 700 }
  ]
}
```

---

**Summary:**
The function operates only on the sorted `"order"` field, returns both the necessary DB updates and the full new ordering, and is designed for robust testability and extension.
