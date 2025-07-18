import { describe, it, expect } from 'vitest';
import { reorderItems, sortItemsByOrder, type OrderableItem } from '../src';


describe('reorderItems() - Pure Function', () => {
  describe('Basic Reordering', () => {
    it('should move item to middle position with midpoint calculation', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
      ];

      const result = reorderItems(items, 'C', 1);

      expect(result.changes).toEqual([
        { id: 'C', order: 150 }, // Midpoint between 100 and 200
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 100 },
        { id: 'C', order: 150 },
        { id: 'B', order: 200 },
      ]);
    });

    it('should move item to first position', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
      ];

      const result = reorderItems(items, 'C', 0);

      expect(result.changes).toEqual([
        { id: 'C', order: 99 }, // 100 - 1 = 99
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'C', order: 99 },
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
      ]);
    });

    it('should move item to last position', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
      ];

      const result = reorderItems(items, 'A', 2);

      expect(result.changes).toEqual([
        { id: 'A', order: 301 }, // 300 + 1 = 301
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
        { id: 'A', order: 301 },
      ]);
    });
  });

  describe('Items Without Order Fields', () => {
    it('should handle items without order fields (treated as end of list)', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B' }, // No order field
        { id: 'C', order: 200 },
      ];

      const result = reorderItems(items, 'B', 1);

      expect(result.changes).toEqual([
        { id: 'B', order: 150 }, // Midpoint between 100 and 200
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 100 },
        { id: 'B', order: 150 },
        { id: 'C', order: 200 },
      ]);
    });

    it('should assign order = 1 for single item without order', () => {
      const items: OrderableItem[] = [
        { id: 'A' }, // No order field
      ];

      const result = reorderItems(items, 'A', 0);

      expect(result.changes).toEqual([
        { id: 'A', order: 1 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 1 },
      ]);
    });
  });

  describe('Unsorted Input Arrays', () => {
    it('should handle unsorted input arrays correctly', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 700 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
        { id: 'D', order: 100 },
        { id: 'E', order: 400 },
      ];

      // Move 'A' to index 1 in sorted order
      const result = reorderItems(items, 'A', 1);

      expect(result.changes).toEqual([
        { id: 'A', order: 150 }, // Midpoint between 100 and 200
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'D', order: 100 },
        { id: 'A', order: 150 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
        { id: 'E', order: 400 },
      ]);
    });
  });

  describe('Tight Gap Detection and Renumbering', () => {
    it('should renumber all items when gaps become too tight', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 1.0 },
        { id: 'B', order: 1.05 }, // Very close gap
        { id: 'C', order: 1.1 },
      ];

      const result = reorderItems(items, 'C', 1);

      // Should renumber all items since midpoint would be too close
      expect(result.changes).toEqual([
        { id: 'A', order: 10 },
        { id: 'C', order: 20 },
        { id: 'B', order: 30 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 10 },
        { id: 'C', order: 20 },
        { id: 'B', order: 30 },
      ]);
    });

    it('should prevent order values from going below 1', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 1.0 },
        { id: 'B', order: 2.0 },
      ];

      const result = reorderItems(items, 'B', 0);

      // Should renumber since order would be less than 1
      expect(result.changes).toEqual([
        { id: 'B', order: 10 },
        { id: 'A', order: 20 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'B', order: 10 },
        { id: 'A', order: 20 },
      ]);
    });
  });

  describe('No-op Cases', () => {
    it('should handle case where item is already in correct position', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
      ];

      const result = reorderItems(items, 'B', 1);

      // B is already in position 1, so calculate where it should be
      const expectedOrder = 200; // B stays at its current order
      expect(result.changes).toEqual([
        { id: 'B', order: expectedOrder },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 100 },
        { id: 'B', order: expectedOrder },
        { id: 'C', order: 300 },
      ]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw error for empty items array', () => {
      expect(() => reorderItems([], 'A', 0)).toThrow('Items array cannot be empty');
    });

    it('should throw error for missing moveId', () => {
      const items: OrderableItem[] = [{ id: 'A', order: 100 }];
      expect(() => reorderItems(items, '', 0)).toThrow('moveId is required');
    });

    it('should throw error for item not found', () => {
      const items: OrderableItem[] = [{ id: 'A', order: 100 }];
      expect(() => reorderItems(items, 'B', 0)).toThrow('Item with id B not found');
    });

    it('should throw error for negative targetIndex', () => {
      const items: OrderableItem[] = [{ id: 'A', order: 100 }];
      expect(() => reorderItems(items, 'A', -1)).toThrow('targetIndex -1 is out of bounds');
    });

    it('should throw error for targetIndex too large', () => {
      const items: OrderableItem[] = [{ id: 'A', order: 100 }];
      expect(() => reorderItems(items, 'A', 1)).toThrow('targetIndex 1 is out of bounds');
    });
  });

  describe('Design Spec Example', () => {
    it('should match the design spec example exactly', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 700 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
        { id: 'D', order: 100 },
        { id: 'E', order: 400 },
      ];

      // Move 'A' to targetIndex 1 (second position in sorted order)
      const result = reorderItems(items, 'A', 1);

      expect(result.changes).toEqual([
        { id: 'A', order: 150 }, // Midpoint between 100 and 200
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'D', order: 100 },
        { id: 'A', order: 150 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
        { id: 'E', order: 400 },
      ]);
    });
  });
});

describe('sortItemsByOrder() - Helper Function', () => {
  it('should sort items by order field with undefined last', () => {
    const items: OrderableItem[] = [
      { id: 'A', order: 300 },
      { id: 'B' }, // No order field
      { id: 'C', order: 100 },
      { id: 'D', order: 200 },
    ];

    const result = sortItemsByOrder(items);

    expect(result).toEqual([
      { id: 'C', order: 100 },
      { id: 'D', order: 200 },
      { id: 'A', order: 300 },
      { id: 'B' }, // Undefined order goes to end
    ]);
  });

  it('should handle all items without order fields', () => {
    const items: OrderableItem[] = [
      { id: 'A' },
      { id: 'B' },
      { id: 'C' },
    ];

    const result = sortItemsByOrder(items);

    // Should maintain original order when all have undefined order
    expect(result).toEqual([
      { id: 'A' },
      { id: 'B' },
      { id: 'C' },
    ]);
  });

  it('should handle empty array', () => {
    const result = sortItemsByOrder([]);
    expect(result).toEqual([]);
  });
});

describe('Invalid Order Values', () => {
  describe('Items with order=0', () => {
    it('should handle items with order=0 by renumbering', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 0 }, // Invalid: below minimum
        { id: 'B', order: 1 },
        { id: 'C', order: 2 },
      ];

      const result = reorderItems(items, 'B', 2);

      // Should renumber all items since order=0 is invalid
      expect(result.changes).toEqual([
        { id: 'A', order: 10 },
        { id: 'C', order: 20 },
        { id: 'B', order: 30 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 10 },
        { id: 'C', order: 20 },
        { id: 'B', order: 30 },
      ]);
    });

    it('should handle multiple items with order=0', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 0 }, // Invalid: below minimum
        { id: 'B', order: 0 }, // Invalid: below minimum
        { id: 'C', order: 1 },
      ];

      const result = reorderItems(items, 'C', 0);

      // Should renumber all items since multiple order=0 values exist
      expect(result.changes).toEqual([
        { id: 'C', order: 10 },
        { id: 'A', order: 20 },
        { id: 'B', order: 30 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'C', order: 10 },
        { id: 'A', order: 20 },
        { id: 'B', order: 30 },
      ]);
    });
  });

  describe('Items with duplicate order values', () => {
    it('should handle duplicate order values by renumbering', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 1 },
        { id: 'B', order: 1 }, // Duplicate order
        { id: 'C', order: 2 },
      ];

      const result = reorderItems(items, 'C', 0);

      // Should renumber all items since duplicate orders exist
      expect(result.changes).toEqual([
        { id: 'C', order: 10 },
        { id: 'A', order: 20 },
        { id: 'B', order: 30 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'C', order: 10 },
        { id: 'A', order: 20 },
        { id: 'B', order: 30 },
      ]);
    });

    it('should handle multiple sets of duplicate order values', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 1 },
        { id: 'B', order: 1 }, // Duplicate order
        { id: 'C', order: 1 }, // Duplicate order
        { id: 'D', order: 2 },
        { id: 'E', order: 2 }, // Duplicate order
      ];

      const result = reorderItems(items, 'D', 1);

      // Should renumber all items since multiple duplicate orders exist
      expect(result.changes).toEqual([
        { id: 'A', order: 10 },
        { id: 'D', order: 20 },
        { id: 'B', order: 30 },
        { id: 'C', order: 40 },
        { id: 'E', order: 50 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'A', order: 10 },
        { id: 'D', order: 20 },
        { id: 'B', order: 30 },
        { id: 'C', order: 40 },
        { id: 'E', order: 50 },
      ]);
    });
  });

  describe('Mixed invalid scenarios', () => {
    it('should handle mix of order=0 and duplicate values', () => {
      // This matches the real database scenario from the user
      const items: OrderableItem[] = [
        { id: 'Functions', order: 1 },
        { id: 'Introduction', order: 1 }, // Duplicate
        { id: 'DOM', order: 1 }, // Duplicate
        { id: 'Objects', order: 0 }, // Invalid: below minimum
        { id: 'Variables', order: 0 }, // Invalid: below minimum
      ];

      const result = reorderItems(items, 'Objects', 0);

      // Should renumber all items since both order=0 and duplicates exist
      expect(result.changes).toEqual([
        { id: 'Objects', order: 10 },
        { id: 'Variables', order: 20 },
        { id: 'Functions', order: 30 },
        { id: 'Introduction', order: 40 },
        { id: 'DOM', order: 50 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'Objects', order: 10 },
        { id: 'Variables', order: 20 },
        { id: 'Functions', order: 30 },
        { id: 'Introduction', order: 40 },
        { id: 'DOM', order: 50 },
      ]);
    });

    it('should handle exact user database scenario', () => {
      // This exactly matches the user's database data
      const items: OrderableItem[] = [
        { id: '6876fd26559d76a2f9269c60', order: 1 }, // Functions and Scope
        { id: '6876fd26559d76a2f9269c5e', order: 1 }, // Introduction to JavaScript
        { id: '6876fd26559d76a2f9269c62', order: 1 }, // DOM Manipulation
        { id: '6876fd26559d76a2f9269c61', order: 0 }, // Objects and Arrays
        { id: '6876fd26559d76a2f9269c5f', order: 0 }, // Data Types and Variables
      ];

      // Try to reorder the first chapter to any position
      const result = reorderItems(items, '6876fd26559d76a2f9269c60', 2);

      // Should renumber all items since both order=0 and duplicates exist
      expect(result.changes).toEqual([
        { id: '6876fd26559d76a2f9269c61', order: 10 },
        { id: '6876fd26559d76a2f9269c5f', order: 20 },
        { id: '6876fd26559d76a2f9269c60', order: 30 },
        { id: '6876fd26559d76a2f9269c5e', order: 40 },
        { id: '6876fd26559d76a2f9269c62', order: 50 },
      ]);

      // All items should have valid order values >= 1
      expect(result.orderedItems.every(item => item.order! >= 1)).toBe(true);
      
      // Should not have any duplicate order values
      const orderValues = result.orderedItems.map(item => item.order!);
      const uniqueOrders = new Set(orderValues);
      expect(uniqueOrders.size).toBe(orderValues.length);
    });

    it('should handle scenario where moved item has invalid order', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 0 }, // Invalid: item to move
        { id: 'B', order: 100 },
        { id: 'C', order: 200 },
      ];

      const result = reorderItems(items, 'A', 1);

      // Should renumber since item being moved has invalid order
      expect(result.changes).toEqual([
        { id: 'B', order: 10 },
        { id: 'A', order: 20 },
        { id: 'C', order: 30 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'B', order: 10 },
        { id: 'A', order: 20 },
        { id: 'C', order: 30 },
      ]);
    });
  });
});

describe('Complex Scenarios', () => {
  it('should handle multiple moves without accumulating tight gaps', () => {
    let items: OrderableItem[] = [
      { id: 'A', order: 100 },
      { id: 'B', order: 200 },
      { id: 'C', order: 300 },
      { id: 'D', order: 400 },
    ];

    // Move A to position 2 (between B and C)
    let result = reorderItems(items, 'A', 2);
    items = result.orderedItems;

    expect(result.changes).toEqual([
      { id: 'A', order: 350 }, // Midpoint between 300 and 400
    ]);

    // Move D to position 1 (between B and A)
    result = reorderItems(items, 'D', 1);
    items = result.orderedItems;

    expect(result.changes).toEqual([
      { id: 'D', order: 250 }, // Midpoint between 200 and 300
    ]);

    // Verify final order
    expect(items).toEqual([
      { id: 'B', order: 200 },
      { id: 'D', order: 250 },
      { id: 'C', order: 300 },
      { id: 'A', order: 350 },
    ]);
  });

  it('should ensure orders never equal 0', () => {
    const items: OrderableItem[] = [
      { id: 'A', order: 0.5 }, // Invalid: below minimum value of 1
      { id: 'B', order: 1.0 },
    ];

    const result = reorderItems(items, 'B', 0);

    // Should trigger renumbering since A has order 0.5 (below minimum of 1)
    expect(result.changes).toEqual([
      { id: 'B', order: 10 }, // Renumbered: first position
      { id: 'A', order: 20 }, // Renumbered: second position
    ]);

    // Verify no order is below minimum value
    expect(result.orderedItems.every(item => item.order! >= 1)).toBe(true);
    
    // Verify final order
    expect(result.orderedItems).toEqual([
      { id: 'B', order: 10 },
      { id: 'A', order: 20 },
    ]);
  });
});

describe('Configurable Options', () => {
  describe('Custom minOrderValue', () => {
    it('should use custom minimum order value', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 50 },
        { id: 'B', order: 100 },
      ];

      const result = reorderItems(items, 'B', 0, { minOrderValue: 10 });

      // B should be placed at max(10, 50-1) = 49
      expect(result.changes).toEqual([
        { id: 'B', order: 49 },
      ]);
    });

    it('should enforce custom minimum order value', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 5 }, // Below custom minimum of 10
        { id: 'B', order: 15 },
      ];

      const result = reorderItems(items, 'B', 0, { 
        minOrderValue: 10,
        renumberGap: 5 
      });

      // Should trigger renumbering because A has order 5 < 10
      expect(result.changes).toEqual([
        { id: 'B', order: 5 },  // First position: 1 * 5
        { id: 'A', order: 10 }, // Second position: 2 * 5
      ]);
    });
  });

  describe('Custom renumberGap', () => {
    it('should use custom renumber gap when renumbering', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 0 }, // Invalid - triggers renumbering
        { id: 'B', order: 1 },
        { id: 'C', order: 2 },
      ];

      const result = reorderItems(items, 'A', 2, { renumberGap: 50 });

      // Should renumber with gap of 50: 50, 100, 150
      expect(result.changes).toEqual([
        { id: 'B', order: 50 },
        { id: 'C', order: 100 },
        { id: 'A', order: 150 },
      ]);
    });
  });

  describe('Custom minOrderGap', () => {
    it('should use custom minimum gap for tight spacing detection', () => {
      // Create items where inserting between them would create tight spacing
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B', order: 100.4 }, // Gap of 0.4
        { id: 'C', order: 200 },
      ];

      // Move C between A and B - midpoint would be (100 + 100.4) / 2 = 100.2
      // With default minOrderGap (0.1), gap of 0.2 to A and 0.2 to B is fine
      const resultDefault = reorderItems(items, 'C', 1);
      expect(resultDefault.changes).toHaveLength(1); // Only C changes
      expect(resultDefault.changes[0]!.order).toBe(100.2);

      // With custom minOrderGap (0.3), gap of 0.2 is too small, should trigger renumbering
      const resultCustom = reorderItems(items, 'C', 1, { 
        minOrderGap: 0.3,
        renumberGap: 50 
      });
      
      expect(resultCustom.changes).toHaveLength(3); // All items change due to renumbering
      expect(resultCustom.changes).toEqual([
        { id: 'A', order: 50 },   // First position: 1 * 50
        { id: 'C', order: 100 },  // Second position: 2 * 50
        { id: 'B', order: 150 },  // Third position: 3 * 50
      ]);
    });
  });

  describe('Combined custom options', () => {
    it('should work with all custom options together', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 3 }, // Below custom minimum of 5
        { id: 'B', order: 8 },
      ];

      const result = reorderItems(items, 'B', 0, {
        minOrderValue: 5,    // Items must be >= 5
        renumberGap: 15,     // Use gaps of 15 when renumbering  
        minOrderGap: 2.0     // Require gaps of at least 2.0
      });

      // Should trigger renumbering due to A having order 3 < 5
      expect(result.changes).toEqual([
        { id: 'B', order: 15 }, // First position: 1 * 15
        { id: 'A', order: 30 }, // Second position: 2 * 15
      ]);

      // Verify all orders meet minimum
      expect(result.orderedItems.every(item => item.order! >= 5)).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    it('should work exactly like before when no options are provided', () => {
      const items: OrderableItem[] = [
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 },
      ];

      const result = reorderItems(items, 'C', 0);

      // Should behave exactly as before: C gets order 99
      expect(result.changes).toEqual([
        { id: 'C', order: 99 },
      ]);

      expect(result.orderedItems).toEqual([
        { id: 'C', order: 99 },
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
      ]);
    });
  });
});