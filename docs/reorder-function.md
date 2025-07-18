# Pure Reorder Function Documentation

## Overview

The pure reorder function provides a robust, side-effect-free solution for reordering items with fractional order values. It's designed to handle chapters, lessons, and sublessons in the academy platform with automatic detection and cleanup of invalid order states.

## Key Features

- ✅ **Pure Function**: No side effects, deterministic output
- ✅ **Automatic Cleanup**: Detects and fixes invalid order values (≤0, duplicates)
- ✅ **Midpoint Insertion**: Uses fractional ordering for efficient repositioning
- ✅ **Smart Renumbering**: Only renumbers when necessary to maintain performance
- ✅ **Type Safe**: Full TypeScript support with comprehensive interfaces

## API Reference

### Core Function

```typescript
function reorderItems(
  items: OrderableItem[],
  moveId: string,
  targetIndex: number,
  options?: ReorderOptions
): ReorderResult
```

### Interfaces

```typescript
interface OrderableItem {
  id: string;
  order?: number;
}

interface ReorderOptions {
  /** Minimum gap required between adjacent order values to avoid renumbering (default: 0.1) */
  minOrderGap?: number;
  /** Gap between items when renumbering all items (default: 10) */
  renumberGap?: number;
  /** Minimum allowed order value (default: 1) */
  minOrderValue?: number;
}

interface ReorderResult {
  changes: { id: string; order: number }[];
  orderedItems: OrderableItem[];
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `items` | `OrderableItem[]` | Array of items to reorder (can be unsorted) |
| `moveId` | `string` | ID of the item to move |
| `targetIndex` | `number` | Target position in sorted array (0-based) |

### Return Value

The function returns a `ReorderResult` object containing:

- **`changes`**: Array of items that need database updates (only changed items)
- **`orderedItems`**: Complete array of items in final sorted order

## Core Concepts

### Order Values

- **Valid Range**: Order values must be ≥ 1
- **Fractional Orders**: Uses decimal values for midpoint insertion (e.g., 1.5, 2.75)
- **Default Assignment**: Items without order are treated as "end of list"

### Midpoint Insertion Algorithm

When moving an item to a new position, the function calculates the new order value based on neighbors:

```typescript
// Examples of midpoint calculation
moveItemBetween(order: 100, order: 200) → newOrder: 150
moveToFirst(nextOrder: 100) → newOrder: 99 (or 1 if < 1)
moveToLast(prevOrder: 300) → newOrder: 301
```

### Automatic Renumbering

The function automatically triggers renumbering when:

1. **Invalid Orders**: Any item has order ≤ 0
2. **Duplicate Orders**: Multiple items share the same order value
3. **Tight Gaps**: New order would be too close to neighbors (< 0.1 gap)
4. **Below Minimum**: Calculated order would be < 1

When renumbering occurs, all items get new order values with consistent gaps:
```
Item 1: order = 10
Item 2: order = 20  
Item 3: order = 30
Item 4: order = 40
```

## Usage Examples

### Basic Reordering

```typescript
const items = [
  { id: 'A', order: 100 },
  { id: 'B', order: 200 },
  { id: 'C', order: 300 }
];

// Move item 'C' to first position
const result = reorderItems(items, 'C', 0);

console.log(result.changes);
// Output: [{ id: 'C', order: 99 }]

console.log(result.orderedItems);
// Output: [
//   { id: 'C', order: 99 },
//   { id: 'A', order: 100 },
//   { id: 'B', order: 200 }
// ]
```

### Handling Invalid Orders

```typescript
const itemsWithInvalidOrders = [
  { id: 'A', order: 1 },
  { id: 'B', order: 1 },    // Duplicate
  { id: 'C', order: 0 },    // Invalid: ≤ 0
  { id: 'D', order: 2 }
];

// Any reorder operation will trigger automatic cleanup
const result = reorderItems(itemsWithInvalidOrders, 'A', 2);

console.log(result.changes);
// Output: All items get new orders
// [
//   { id: 'C', order: 10 },
//   { id: 'D', order: 20 },
//   { id: 'A', order: 30 },
//   { id: 'B', order: 40 }
// ]
```

### Items Without Orders

```typescript
const mixedItems = [
  { id: 'A', order: 100 },
  { id: 'B' },              // No order field
  { id: 'C', order: 200 }
];

// Items without order are treated as "end of list"
const result = reorderItems(mixedItems, 'B', 1);

console.log(result.changes);
// Output: [{ id: 'B', order: 150 }]
```

## Database Integration

### Repository Usage Pattern

```typescript
// In your repository class
async reorderChapters(courseId: string, chapterIds: string[], context: RepositoryContext): Promise<void> {
  // 1. Get current chapters
  const course = await this.collection.findById(new ObjectId(courseId));
  
  // 2. Convert to OrderableItem format
  const orderableChapters: OrderableItem[] = course.chapters.map(chapter => ({
    id: chapter.id.toString(),
    order: chapter.order,
  }));

  // 3. Determine which item moved and to where
  const currentOrder = orderableChapters
    .sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER))
    .map(ch => ch.id);
  
  let movedChapterId: string | null = null;
  let newPosition = -1;
  
  for (let i = 0; i < chapterIds.length; i++) {
    if (currentOrder[i] !== chapterIds[i]) {
      movedChapterId = chapterIds[i];
      newPosition = i;
      break;
    }
  }

  if (!movedChapterId) return; // No changes needed

  // 4. Use pure reorder function
  const reorderResult = reorderItems(orderableChapters, movedChapterId, newPosition);

  // 5. Apply only the necessary database updates
  for (const change of reorderResult.changes) {
    await this.collection.updateById(
      new ObjectId(change.id),
      { $set: { order: change.order } },
      { userContext: this.resolveUserContext(context) }
    );
  }
}
```

## Error Handling

### Input Validation Errors

```typescript
// Empty array
reorderItems([], 'A', 0) 
// ❌ Throws: "Items array cannot be empty"

// Invalid moveId
reorderItems([{ id: 'A', order: 1 }], '', 0)
// ❌ Throws: "moveId is required"

// Item not found
reorderItems([{ id: 'A', order: 1 }], 'B', 0)
// ❌ Throws: "Item with id B not found"

// Invalid target index
reorderItems([{ id: 'A', order: 1 }], 'A', 5)
// ❌ Throws: "targetIndex 5 is out of bounds for array of length 1"
```

### Graceful Degradation

The function handles edge cases gracefully:

- **Single Item**: Never triggers renumbering
- **Already in Position**: Still calculates proper order value
- **Mixed Order Types**: Handles items with and without order fields

## Performance Characteristics

### Time Complexity
- **Best Case**: O(n) - when only one item needs updating
- **Worst Case**: O(n log n) - due to sorting operations
- **Renumbering**: O(n) - when all items need new orders

### Space Complexity
- **Memory Usage**: O(n) - creates copies of arrays, no in-place mutations
- **Database Impact**: Only updates changed items, not entire arrays

### Optimization Features

1. **Minimal Updates**: Only items with changed orders are included in `changes`
2. **Smart Detection**: Efficiently detects when renumbering is needed
3. **Single Pass**: Calculates all changes in one function call

## Configuration Constants

```typescript
const MIN_ORDER_GAP = 0.1;        // Minimum gap between adjacent orders
const RENUMBER_GAP = 10;          // Gap between items when renumbering
const MIN_ORDER_VALUE = 1;        // Minimum allowed order value
```

### Customization

These constants can be adjusted based on your needs:

- **Increase `MIN_ORDER_GAP`**: For more conservative spacing
- **Increase `RENUMBER_GAP`**: For larger gaps during renumbering
- **Change `MIN_ORDER_VALUE`**: If you need different minimum values

## Edge Cases and Solutions

### Problem: Order Values Going to Zero

```typescript
// ❌ Before: Database has chapters with order=0
const chapters = [
  { id: 'A', order: 0 },  // Invalid
  { id: 'B', order: 1 },
  { id: 'C', order: 2 }
];

// ✅ After: Automatic cleanup
const result = reorderItems(chapters, 'B', 0);
// All items get valid orders: 10, 20, 30
```

### Problem: Duplicate Order Values

```typescript
// ❌ Before: Multiple items with same order
const chapters = [
  { id: 'A', order: 1 },
  { id: 'B', order: 1 },  // Duplicate
  { id: 'C', order: 1 }   // Duplicate
];

// ✅ After: Automatic deduplication
const result = reorderItems(chapters, 'C', 0);
// Orders become: 10, 20, 30 (all unique)
```

### Problem: Tight Order Spacing

```typescript
// ❌ Before: Orders too close together
const items = [
  { id: 'A', order: 1.0 },
  { id: 'B', order: 1.05 }, // Gap = 0.05 < MIN_ORDER_GAP
  { id: 'C', order: 1.1 }
];

// ✅ After: Automatic renumbering
const result = reorderItems(items, 'C', 0);
// Orders become: 10, 20, 30 (proper spacing)
```

## Testing and Validation

### Test Coverage

The reorder function includes comprehensive tests for:

- ✅ Basic reordering scenarios
- ✅ Invalid order value handling
- ✅ Edge cases and error conditions
- ✅ Performance characteristics
- ✅ Real-world database scenarios

### Validation Helpers

```typescript
// Helper function to validate order arrays
export function validateOrderIntegrity(items: OrderableItem[]): boolean {
  const orders = items
    .filter(item => item.order !== undefined)
    .map(item => item.order!);
  
  // Check for invalid values
  if (orders.some(order => order <= 0)) return false;
  
  // Check for duplicates
  const uniqueOrders = new Set(orders);
  return uniqueOrders.size === orders.length;
}
```

## Migration Guide

### Upgrading from Hardcoded Logic

If you're migrating from hardcoded ordering logic:

```typescript
// ❌ Old approach: Hardcoded calculations
const newOrder = targetIndex * 100; // Inflexible

// ✅ New approach: Pure function
const result = reorderItems(currentItems, movedId, targetIndex);
const newOrder = result.changes.find(c => c.id === movedId)?.order;
```

### Database Schema Considerations

Ensure your database supports:
- **Fractional orders**: Use `float`/`double` instead of `integer`
- **Nullable orders**: Allow `NULL` for items without explicit ordering
- **Indexing**: Consider indexing order fields for sorting performance

## Best Practices

### 1. Always Use the Pure Function

```typescript
// ✅ Good: Use pure function
const result = reorderItems(items, moveId, targetIndex);

// ❌ Bad: Manual order calculation
const newOrder = calculateOrderMyself(targetIndex);
```

### 2. Handle the Complete Result

```typescript
// ✅ Good: Apply all changes
for (const change of result.changes) {
  await updateItemOrder(change.id, change.order);
}

// ❌ Bad: Only update moved item
await updateItemOrder(moveId, result.changes[0]?.order);
```

### 3. Validate Inputs

```typescript
// ✅ Good: Validate before calling
if (!items.length || !moveId || targetIndex < 0) {
  throw new Error('Invalid reorder parameters');
}

const result = reorderItems(items, moveId, targetIndex);
```

### 4. Log Renumbering Events

```typescript
// ✅ Good: Monitor when renumbering occurs
const result = reorderItems(items, moveId, targetIndex);

if (result.changes.length > 1) {
  logger.info('Renumbering triggered', {
    itemCount: items.length,
    changesCount: result.changes.length,
    operation: 'reorderItems'
  });
}
```

## Troubleshooting

### Issue: Reordering Not Working in UI

**Symptoms**: Drag-and-drop fails silently or items snap back

**Cause**: Usually invalid order values in database (order=0, duplicates)

**Solution**: 
```typescript
// Check for invalid orders
const hasInvalidOrders = !validateOrderIntegrity(items);
if (hasInvalidOrders) {
  // Any reorder operation will clean up invalid states
  const result = reorderItems(items, items[0].id, 0);
  // Apply the cleanup changes to database
}
```

### Issue: Performance Problems

**Symptoms**: Slow reordering with large datasets

**Solutions**:
1. **Index order fields** in your database
2. **Limit concurrent reorders** in UI
3. **Batch database updates** when possible

### Issue: Order Values Growing Too Large

**Symptoms**: Order values become very large numbers

**Solution**: Periodic renumbering
```typescript
// Detect when orders get too large
const maxOrder = Math.max(...items.map(i => i.order || 0));
if (maxOrder > 10000) {
  // Force renumbering by triggering invalid state detection
  const result = reorderItems(items, items[0].id, 0);
  // This will reset all orders to 10, 20, 30, etc.
}
```

## Related Documentation

- [Chapter Ordering Design Spec](./chapter-ordering.md)
- [Database Schema Documentation](./database-schema.md)
- [UI Drag-and-Drop Integration](./ui-integration.md)
- [Performance Optimization Guide](./performance.md)