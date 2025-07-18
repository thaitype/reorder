/**
 * Pure reorder function for handling item ordering logic
 *
 * This module provides a robust, side-effect-free solution for reordering items
 * with fractional order values. It automatically detects and cleans up invalid
 * order states while maintaining optimal performance through minimal database updates.
 *
 * Key Features:
 * - Pure function design (no side effects)
 * - Automatic cleanup of invalid order values (≤0, duplicates)
 * - Midpoint insertion algorithm for efficient repositioning
 * - Smart renumbering only when necessary
 * - Type-safe with comprehensive error handling
 *
 * @example
 * ```typescript
 * const items = [
 *   { id: 'A', order: 100 },
 *   { id: 'B', order: 200 },
 *   { id: 'C', order: 300 }
 * ];
 *
 * // Move item 'C' to first position
 * const result = reorderItems(items, 'C', 0);
 * console.log(result.changes); // [{ id: 'C', order: 99 }]
 * ```
 */

/**
 * Represents an item that can be reordered with an optional order field
 */
export interface OrderableItem {
  /** Unique identifier for the item */
  id: string;
  /**
   * Optional order value for positioning (must be ≥ 1 when present)
   * Items without order are treated as "end of list"
   */
  order?: number;
}

/**
 * Configuration options for the reorderItems function
 */
export interface ReorderOptions {
  /**
   * Minimum gap required between adjacent order values to avoid renumbering
   * @default 0.1
   */
  minOrderGap?: number;
  /**
   * Gap between items when renumbering all items (results in 10, 20, 30, etc.)
   * @default 10
   */
  renumberGap?: number;
  /**
   * Minimum allowed order value (orders must be ≥ this value)
   * @default 1
   */
  minOrderValue?: number;
}

/**
 * Result of a reorder operation containing database changes and final item order
 */
export interface ReorderResult {
  /**
   * Array of items that need database updates (only items with changed orders)
   * Use this to minimize database writes by updating only what changed
   */
  changes: { id: string; order: number }[];
  /**
   * Complete array of items in their final sorted order
   * Use this for UI state updates or validation
   */
  orderedItems: OrderableItem[];
}

/** Default minimum gap required between adjacent order values to avoid renumbering */
const DEFAULT_MIN_ORDER_GAP = 0.1;
/** Default gap between items when renumbering all items (results in 10, 20, 30, etc.) */
const DEFAULT_RENUMBER_GAP = 10;
/** Default minimum allowed order value (orders must be ≥ 1) */
const DEFAULT_MIN_ORDER_VALUE = 1;

/**
 * Pure function to reorder items by moving one item to a new position
 *
 * This function implements a robust reordering algorithm that:
 * 1. Validates all inputs and throws descriptive errors for invalid data
 * 2. Uses midpoint insertion to calculate optimal order values
 * 3. Automatically detects and fixes invalid order states (≤0, duplicates)
 * 4. Returns minimal changes for efficient database updates
 *
 * @param items - Array of items with { id, order? } structure (may be unsorted)
 * @param moveId - ID of the item to move (must exist in items array)
 * @param targetIndex - Target position in the sorted array (0-based, 0 = first position)
 * @param options - Optional configuration for gap sizes and minimum values
 * @returns Object containing changes for database and complete ordered items array
 *
 * @throws {Error} When items array is empty
 * @throws {Error} When moveId is empty or not found
 * @throws {Error} When targetIndex is out of bounds
 *
 * @example
 * ```typescript
 * // Basic reordering
 * const items = [
 *   { id: 'A', order: 100 },
 *   { id: 'B', order: 200 },
 *   { id: 'C', order: 300 }
 * ];
 *
 * const result = reorderItems(items, 'C', 0); // Move C to first
 * // result.changes: [{ id: 'C', order: 99 }]
 * // result.orderedItems: [C(99), A(100), B(200)]
 * ```
 *
 * @example
 * ```typescript
 * // Automatic cleanup of invalid orders
 * const invalidItems = [
 *   { id: 'A', order: 1 },
 *   { id: 'B', order: 1 },  // Duplicate
 *   { id: 'C', order: 0 }   // Invalid
 * ];
 *
 * const result = reorderItems(invalidItems, 'A', 2);
 * // All items get new orders: result.changes contains all 3 items
 * ```
 *
 * @example
 * ```typescript
 * // Custom configuration options
 * const items = [
 *   { id: 'A', order: 100 },
 *   { id: 'B', order: 200 }
 * ];
 *
 * const result = reorderItems(items, 'B', 0, {
 *   minOrderGap: 0.5,    // Require larger gaps before renumbering
 *   renumberGap: 50,     // Use 50, 100, 150 when renumbering
 *   minOrderValue: 10    // Minimum order value is 10 instead of 1
 * });
 * ```
 */
export function reorderItems(
  items: OrderableItem[],
  moveId: string,
  targetIndex: number,
  options: ReorderOptions = {}
): ReorderResult {
  // Merge provided options with defaults
  const config = {
    minOrderGap: options.minOrderGap ?? DEFAULT_MIN_ORDER_GAP,
    renumberGap: options.renumberGap ?? DEFAULT_RENUMBER_GAP,
    minOrderValue: options.minOrderValue ?? DEFAULT_MIN_ORDER_VALUE,
  };
  // Validate inputs
  if (!items || items.length === 0) {
    throw new Error('Items array cannot be empty');
  }

  if (!moveId) {
    throw new Error('moveId is required');
  }

  if (targetIndex < 0 || targetIndex >= items.length) {
    throw new Error(`targetIndex ${targetIndex} is out of bounds for array of length ${items.length}`);
  }

  // Find the item to move
  const moveItem = items.find(item => item.id === moveId);
  if (!moveItem) {
    throw new Error(`Item with id ${moveId} not found`);
  }

  // Sort items by order field (undefined orders go to end)
  const sortedItems = [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  // Remove the item to move from its current position
  const itemsWithoutMoved = sortedItems.filter(item => item.id !== moveId);

  // Calculate new order for the moved item based on target position
  const prevItem = targetIndex > 0 ? itemsWithoutMoved[targetIndex - 1] : null;
  const nextItem = targetIndex < itemsWithoutMoved.length ? itemsWithoutMoved[targetIndex] : null;

  let newOrder = calculateOrderPosition(config, prevItem?.order, nextItem?.order);

  // Insert the moved item at the target position with new order
  const newSortedItems = [...itemsWithoutMoved];
  newSortedItems.splice(targetIndex, 0, { ...moveItem, order: newOrder });

  // Check if we need to renumber due to tight gaps or invalid existing orders
  let finalOrderedItems = newSortedItems;
  let changes: { id: string; order: number }[] = [];

  if (needsRenumbering(items, targetIndex, newOrder, moveId, config)) {
    // Renumber all items with even gaps
    const renumberedItems = renumberAllItems(newSortedItems, config);
    finalOrderedItems = renumberedItems;

    // All items with order fields need updating
    changes = renumberedItems
      .filter(item => item.order !== undefined)
      .map(item => ({ id: item.id, order: item.order! }));
  } else {
    // Only the moved item needs updating
    changes = [{ id: moveId, order: newOrder }];
  }

  return {
    changes,
    orderedItems: finalOrderedItems,
  };
}

/**
 * Calculate the optimal order position based on neighboring items
 *
 * This function implements the midpoint insertion algorithm, which places
 * items at the midpoint between their neighbors to minimize database updates.
 * It ensures all calculated orders are ≥ configured minimum value.
 *
 * @param config - Configuration object with minOrderValue setting
 * @param prevOrder - Order value of the previous item (undefined if inserting at start)
 * @param nextOrder - Order value of the next item (undefined if inserting at end)
 * @returns Calculated order value for the item being positioned
 *
 * @example
 * ```typescript
 * calculateOrderPosition(config, 100, 200)     // → 150 (midpoint)
 * calculateOrderPosition(config, undefined, 100) // → 99 (before first, but ≥ 1)
 * calculateOrderPosition(config, 300, undefined) // → 301 (after last)
 * calculateOrderPosition(config, undefined, undefined) // → 1 (empty list)
 * ```
 */
function calculateOrderPosition(config: { minOrderValue: number }, prevOrder?: number, nextOrder?: number): number {
  // If list is empty, assign order = minOrderValue
  if (!prevOrder && !nextOrder) {
    return config.minOrderValue;
  }

  // If only next exists, place before it (but ensure ≥ minOrderValue)
  if (!prevOrder && nextOrder) {
    return Math.max(config.minOrderValue, nextOrder - 1);
  }

  // If only previous exists, place after it
  if (prevOrder && !nextOrder) {
    return prevOrder + 1;
  }

  // Both neighbors exist, use midpoint (but ensure ≥ minOrderValue)
  if (prevOrder && nextOrder) {
    const midpoint = (prevOrder + nextOrder) / 2;
    return Math.max(config.minOrderValue, midpoint);
  }

  return config.minOrderValue;
}

/**
 * Check if renumbering is needed due to tight gaps or invalid existing orders
 *
 * This function determines whether to apply minimal updates (single item) or
 * perform a complete renumbering operation. Renumbering is triggered when:
 * - Any item has order ≤ 0 (invalid)
 * - Multiple items share the same order (duplicates)
 * - New order would be < configured minimum value
 * - New order would be too close to neighbors (< configured minimum gap)
 *
 * @param items - Original array of items being reordered
 * @param targetIndex - Target position for the moved item
 * @param newOrder - Calculated order value for the moved item
 * @param moveId - ID of the item being moved (to exclude from neighbor checks)
 * @param config - Configuration object with minOrderValue and minOrderGap settings
 * @returns true if renumbering is needed, false for minimal updates
 */
function needsRenumbering(
  items: OrderableItem[],
  targetIndex: number,
  newOrder: number,
  moveId: string,
  config: { minOrderValue: number; minOrderGap: number }
): boolean {
  // Special case: single item never needs renumbering
  if (items.length === 1) {
    return false;
  }

  // Check if new order would be less than minimum
  if (newOrder < config.minOrderValue) {
    return true;
  }

  // Check if any existing items have invalid order values
  if (hasInvalidOrderValues(items, config)) {
    return true;
  }

  // Check if the new order would be too close to neighbors
  // Get the sorted items without the moved item to determine proper neighbors
  const sortedItemsWithoutMoved = [...items]
    .filter(item => item.id !== moveId)
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

  const prevItem = targetIndex > 0 ? sortedItemsWithoutMoved[targetIndex - 1] : null;
  const nextItem = targetIndex < sortedItemsWithoutMoved.length ? sortedItemsWithoutMoved[targetIndex] : null;

  if (prevItem && prevItem.order !== undefined && Math.abs(newOrder - prevItem.order) < config.minOrderGap) {
    return true;
  }

  if (nextItem && nextItem.order !== undefined && Math.abs(newOrder - nextItem.order) < config.minOrderGap) {
    return true;
  }

  return false;
}

/**
 * Check if the items array contains invalid order values
 *
 * This function detects two types of invalid states:
 * 1. Order values below configured minimum value
 * 2. Duplicate order values (multiple items with same order)
 *
 * When invalid values are detected, the reorder function will automatically
 * trigger a complete renumbering to fix the data integrity issues.
 *
 * @param items - Array of items to validate
 * @param config - Configuration object with minOrderValue setting
 * @returns true if any invalid order values are found, false if all orders are valid
 */
function hasInvalidOrderValues(items: OrderableItem[], config: { minOrderValue: number }): boolean {
  const ordersWithValues = items.filter(item => item.order !== undefined).map(item => item.order!);

  // Check for order values below configured minimum
  if (ordersWithValues.some(order => order < config.minOrderValue)) {
    return true;
  }

  // Check for duplicate order values
  const uniqueOrders = new Set(ordersWithValues);
  if (uniqueOrders.size !== ordersWithValues.length) {
    return true;
  }

  return false;
}

/**
 * Renumber all items with consistent gaps
 *
 * This function assigns new order values to all items with even spacing.
 * The resulting orders will use the configured gap (e.g., 10, 20, 30, 40, etc.).
 *
 * This is called when the existing order values are in an invalid state
 * and need to be completely reset for data integrity.
 *
 * @param items - Array of items to renumber (should be in desired final order)
 * @param config - Configuration object with renumberGap setting
 * @returns New array with all items having fresh order values
 */
function renumberAllItems(items: OrderableItem[], config: { renumberGap: number }): OrderableItem[] {
  return items.map((item, index) => ({
    ...item,
    order: (index + 1) * config.renumberGap,
  }));
}

/**
 * Helper function to sort items by their order field
 *
 * Items without order values are placed at the end of the sorted array.
 * This is useful for displaying items in their correct order regardless
 * of the input array sequence.
 *
 * @param items - Array of items to sort
 * @returns New sorted array (original array is not modified)
 *
 * @example
 * ```typescript
 * const unsorted = [
 *   { id: 'C', order: 300 },
 *   { id: 'A', order: 100 },
 *   { id: 'B' }  // No order
 * ];
 *
 * const sorted = sortItemsByOrder(unsorted);
 * // Result: [A(100), C(300), B(undefined)]
 * ```
 */
export function sortItemsByOrder(items: OrderableItem[]): OrderableItem[] {
  return [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}
