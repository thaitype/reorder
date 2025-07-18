/**
 * Basic Usage Examples for the Reorder Function
 * 
 * This file demonstrates common usage patterns for the reorderItems function
 * with practical examples you might encounter in the academy platform.
 */

import { reorderItems, sortItemsByOrder, type OrderableItem } from '@thaitype/reorder';

// ============================================================================
// Example 1: Basic Chapter Reordering
// ============================================================================

export function basicChapterReordering() {
  console.log('=== Basic Chapter Reordering ===');
  
  const chapters: OrderableItem[] = [
    { id: 'intro', order: 100 },
    { id: 'basics', order: 200 },
    { id: 'advanced', order: 300 },
    { id: 'conclusion', order: 400 }
  ];

  console.log('Original order:', chapters.map(c => c.id));
  // Output: ['intro', 'basics', 'advanced', 'conclusion']

  // Move 'advanced' to second position (index 1)
  const result = reorderItems(chapters, 'advanced', 1);

  console.log('Changes needed:', result.changes);
  // Output: [{ id: 'advanced', order: 150 }]

  console.log('New order:', result.orderedItems.map(c => c.id));
  // Output: ['intro', 'advanced', 'basics', 'conclusion']

  console.log('Only one database update needed for optimal performance!');
}

// ============================================================================
// Example 2: Moving to First Position
// ============================================================================

export function moveToFirstPosition() {
  console.log('\n=== Moving to First Position ===');
  
  const lessons: OrderableItem[] = [
    { id: 'lesson1', order: 50 },
    { id: 'lesson2', order: 100 },
    { id: 'lesson3', order: 150 }
  ];

  // Move lesson3 to first position
  const result = reorderItems(lessons, 'lesson3', 0);

  console.log('Changes:', result.changes);
  // Output: [{ id: 'lesson3', order: 49 }]

  console.log('Final order:');
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });
  // Output:
  //   lesson3: order=49
  //   lesson1: order=50
  //   lesson2: order=100
}

// ============================================================================
// Example 3: Moving to Last Position
// ============================================================================

export function moveToLastPosition() {
  console.log('\n=== Moving to Last Position ===');
  
  const sublessons: OrderableItem[] = [
    { id: 'intro', order: 10 },
    { id: 'content', order: 20 },
    { id: 'summary', order: 30 }
  ];

  // Move intro to last position
  const result = reorderItems(sublessons, 'intro', 2);

  console.log('Changes:', result.changes);
  // Output: [{ id: 'intro', order: 31 }]

  console.log('Final order:');
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });
  // Output:
  //   content: order=20
  //   summary: order=30
  //   intro: order=31
}

// ============================================================================
// Example 4: Working with Items Without Orders
// ============================================================================

export function itemsWithoutOrders() {
  console.log('\n=== Items Without Orders ===');
  
  const mixedItems: OrderableItem[] = [
    { id: 'chapter1', order: 100 },
    { id: 'chapter2' }, // No order - treated as "end of list"
    { id: 'chapter3', order: 200 },
    { id: 'chapter4' }  // No order - treated as "end of list"
  ];

  console.log('Sorted items:');
  const sorted = sortItemsByOrder(mixedItems);
  sorted.forEach(item => {
    console.log(`  ${item.id}: order=${item.order || 'undefined'}`);
  });
  // Output:
  //   chapter1: order=100
  //   chapter3: order=200
  //   chapter2: order=undefined
  //   chapter4: order=undefined

  // Give chapter2 a proper order by moving it to position 1
  const result = reorderItems(mixedItems, 'chapter2', 1);

  console.log('\nAfter giving chapter2 an order:');
  console.log('Changes:', result.changes);
  // Output: [{ id: 'chapter2', order: 150 }]

  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order || 'undefined'}`);
  });
  // Output:
  //   chapter1: order=100
  //   chapter2: order=150
  //   chapter3: order=200
  //   chapter4: order=undefined
}

// ============================================================================
// Example 5: Tight Spacing and Automatic Renumbering
// ============================================================================

export function tightSpacingExample() {
  console.log('\n=== Tight Spacing Example ===');
  
  const tightlySpacedItems: OrderableItem[] = [
    { id: 'A', order: 1.0 },
    { id: 'B', order: 1.05 }, // Very close to A
    { id: 'C', order: 1.1 }   // Very close to B
  ];

  console.log('Original tight spacing:');
  tightlySpacedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });

  // Try to move C between A and B - this will trigger renumbering
  const result = reorderItems(tightlySpacedItems, 'C', 1);

  console.log('\nTight spacing detected! Automatic renumbering triggered.');
  console.log('Changes (all items updated):', result.changes);
  // Output: All 3 items get new orders with proper spacing

  console.log('\nAfter renumbering:');
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });
  // Output:
  //   A: order=10
  //   C: order=20
  //   B: order=30
}

// ============================================================================
// Example 6: Midpoint Calculation Examples
// ============================================================================

export function midpointExamples() {
  console.log('\n=== Midpoint Calculation Examples ===');
  
  const items: OrderableItem[] = [
    { id: 'first', order: 100 },
    { id: 'last', order: 300 }
  ];

  // Insert between 100 and 300
  const result1 = reorderItems([...items, { id: 'middle' }], 'middle', 1);
  console.log('Insert between 100 and 300:');
  console.log(`  New order: ${result1.changes[0].order}`); // 200 (midpoint)

  // Insert before 100
  const result2 = reorderItems([...items, { id: 'before' }], 'before', 0);
  console.log('Insert before 100:');
  console.log(`  New order: ${result2.changes[0].order}`); // 99

  // Insert after 300
  const result3 = reorderItems([...items, { id: 'after' }], 'after', 2);
  console.log('Insert after 300:');
  console.log(`  New order: ${result3.changes[0].order}`); // 301
}

// ============================================================================
// Example 7: Performance-Optimized Usage
// ============================================================================

export function performanceOptimizedUsage() {
  console.log('\n=== Performance-Optimized Usage ===');
  
  const manyItems: OrderableItem[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `item-${i}`,
    order: (i + 1) * 10 // Orders: 10, 20, 30, ..., 10000
  }));

  console.log(`Starting with ${manyItems.length} items`);

  // Move item from middle to beginning - only 1 database update needed
  const startTime = Date.now();
  const result = reorderItems(manyItems, 'item-500', 0);
  const endTime = Date.now();

  console.log(`Operation completed in ${endTime - startTime}ms`);
  console.log(`Only ${result.changes.length} database update(s) needed`);
  console.log(`First few items after reorder:`);
  
  result.orderedItems.slice(0, 5).forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });
  // Output shows item-500 is now first with order=9
}

// ============================================================================
// Example 8: Error Handling
// ============================================================================

export function errorHandlingExamples() {
  console.log('\n=== Error Handling Examples ===');
  
  const items: OrderableItem[] = [
    { id: 'A', order: 100 },
    { id: 'B', order: 200 }
  ];

  // Example 1: Empty array
  try {
    reorderItems([], 'A', 0);
  } catch (error) {
    console.log('Empty array error:', error instanceof Error ? error.message : String(error));
    // Output: "Items array cannot be empty"
  }

  // Example 2: Item not found
  try {
    reorderItems(items, 'MISSING', 0);
  } catch (error) {
    console.log('Item not found error:', error instanceof Error ? error.message : String(error));
    // Output: "Item with id MISSING not found"
  }

  // Example 3: Invalid target index
  try {
    reorderItems(items, 'A', 5);
  } catch (error) {
    console.log('Invalid index error:', error instanceof Error ? error.message : String(error));
    // Output: "targetIndex 5 is out of bounds for array of length 2"
  }

  console.log('All errors provide clear, descriptive messages for debugging');
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  console.log('🚀 Running Reorder Function Examples\n');
  
  basicChapterReordering();
  moveToFirstPosition();
  moveToLastPosition();
  itemsWithoutOrders();
  tightSpacingExample();
  midpointExamples();
  performanceOptimizedUsage();
  errorHandlingExamples();
  
  console.log('\n✅ All examples completed successfully!');
}

// Uncomment to run examples:
// runAllExamples();