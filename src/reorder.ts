/**
 * Pure reorder function for handling item ordering logic
 * Supports chapters, lessons, and sublessons with { id, order? } structure
 */

export interface OrderableItem {
  id: string;
  order?: number;
}

export interface ReorderResult {
  changes: { id: string; order: number }[];
  orderedItems: OrderableItem[];
}

const MIN_ORDER_GAP = 0.1;
const RENUMBER_GAP = 10;
const MIN_ORDER_VALUE = 1;

/**
 * Pure function to reorder items by moving one item to a new position
 * 
 * @param items - Array of items with { id, order? } structure (may be unsorted)
 * @param moveId - ID of the item to move
 * @param targetIndex - Target position in the sorted array (0 = first)
 * @returns Object with changes needed for DB and full ordered items array
 */
export function reorderItems(
  items: OrderableItem[],
  moveId: string,
  targetIndex: number
): ReorderResult {
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

  let newOrder = calculateOrderPosition(prevItem?.order, nextItem?.order);

  // Insert the moved item at the target position with new order
  const newSortedItems = [...itemsWithoutMoved];
  newSortedItems.splice(targetIndex, 0, { ...moveItem, order: newOrder });

  // Check if we need to renumber due to tight gaps or invalid existing orders
  let finalOrderedItems = newSortedItems;
  let changes: { id: string; order: number }[] = [];

  if (needsRenumbering(items, targetIndex, newOrder, moveId)) {
    // Renumber all items with even gaps
    const renumberedItems = renumberAllItems(newSortedItems);
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
 * Calculate the order position based on neighbors
 */
function calculateOrderPosition(prevOrder?: number, nextOrder?: number): number {
  // If list is empty, assign order = 1
  if (!prevOrder && !nextOrder) {
    return MIN_ORDER_VALUE;
  }

  // If only next exists, place before it
  if (!prevOrder && nextOrder) {
    return Math.max(MIN_ORDER_VALUE, nextOrder - 1);
  }

  // If only previous exists, place after it
  if (prevOrder && !nextOrder) {
    return prevOrder + 1;
  }

  // Both neighbors exist, use midpoint
  if (prevOrder && nextOrder) {
    const midpoint = (prevOrder + nextOrder) / 2;
    return Math.max(MIN_ORDER_VALUE, midpoint);
  }

  return MIN_ORDER_VALUE;
}

/**
 * Check if renumbering is needed due to tight gaps or invalid existing orders
 */
function needsRenumbering(items: OrderableItem[], targetIndex: number, newOrder: number, moveId: string): boolean {
  // Special case: single item never needs renumbering
  if (items.length === 1) {
    return false;
  }

  // Check if new order would be less than minimum
  if (newOrder < MIN_ORDER_VALUE) {
    return true;
  }

  // Check if any existing items have invalid order values
  if (hasInvalidOrderValues(items)) {
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

  if (prevItem && prevItem.order !== undefined && Math.abs(newOrder - prevItem.order) < MIN_ORDER_GAP) {
    return true;
  }

  if (nextItem && nextItem.order !== undefined && Math.abs(newOrder - nextItem.order) < MIN_ORDER_GAP) {
    return true;
  }

  return false;
}

/**
 * Check if the items array contains invalid order values
 */
function hasInvalidOrderValues(items: OrderableItem[]): boolean {
  const ordersWithValues = items
    .filter(item => item.order !== undefined)
    .map(item => item.order!);

  // Check for order values that are zero or negative (truly invalid)
  if (ordersWithValues.some(order => order <= 0)) {
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
 */
function renumberAllItems(items: OrderableItem[]): OrderableItem[] {
  return items.map((item, index) => ({
    ...item,
    order: (index + 1) * RENUMBER_GAP,
  }));
}

/**
 * Helper function to sort items by their order field
 */
export function sortItemsByOrder(items: OrderableItem[]): OrderableItem[] {
  return [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}