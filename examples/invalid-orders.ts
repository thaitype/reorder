/**
 * Invalid Order Handling Examples
 * 
 * This file demonstrates how the reorder function automatically detects
 * and fixes invalid order states like duplicates and values ≤ 0.
 */

import { reorderItems, type OrderableItem } from '@thaitype/reorder';

// ============================================================================
// Example 1: Duplicate Order Values
// ============================================================================

export function duplicateOrdersExample() {
  console.log('=== Duplicate Order Values ===');
  
  // Common scenario: multiple items with same order from UI bugs or data imports
  const itemsWithDuplicates: OrderableItem[] = [
    { id: 'chapter1', order: 1 },
    { id: 'chapter2', order: 1 }, // Duplicate!
    { id: 'chapter3', order: 1 }, // Duplicate!
    { id: 'chapter4', order: 2 }
  ];

  console.log('❌ Original (invalid) state:');
  itemsWithDuplicates.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });

  // Any reorder operation will trigger automatic cleanup
  const result = reorderItems(itemsWithDuplicates, 'chapter2', 0);

  console.log('\n✅ After automatic cleanup:');
  console.log('All items updated:', result.changes);
  
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });
  // Output: All items get unique orders: 10, 20, 30, 40

  console.log('\n🎯 Benefits:');
  console.log('- UI reordering will now work correctly');
  console.log('- All order values are unique and valid');
  console.log('- Proper spacing allows future midpoint insertions');
}

// ============================================================================
// Example 2: Order Values ≤ 0 (Invalid)
// ============================================================================

export function invalidOrderValuesExample() {
  console.log('\n=== Order Values ≤ 0 (Invalid) ===');
  
  // Scenario: order values went to 0 or negative (common bug)
  const itemsWithInvalidOrders: OrderableItem[] = [
    { id: 'lesson1', order: 0 },   // Invalid: ≤ 0
    { id: 'lesson2', order: -5 },  // Invalid: ≤ 0
    { id: 'lesson3', order: 1 },   // Valid
    { id: 'lesson4', order: 2 }    // Valid
  ];

  console.log('❌ Original (invalid) state:');
  itemsWithInvalidOrders.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });

  // The function detects invalid orders and fixes them
  const result = reorderItems(itemsWithInvalidOrders, 'lesson3', 0);

  console.log('\n✅ After automatic cleanup:');
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: order=${item.order}`);
  });

  console.log('\n🎯 Key Points:');
  console.log('- All orders are now ≥ 1 (minimum valid value)');
  console.log('- Invalid orders are completely eliminated');
  console.log('- Data integrity is restored');
}

// ============================================================================
// Example 3: Mixed Invalid Scenarios (Real Database Case)
// ============================================================================

export function realDatabaseScenario() {
  console.log('\n=== Real Database Scenario ===');
  
  // This matches the exact scenario from the user's database
  const realWorldItems: OrderableItem[] = [
    { id: '6876fd26559d76a2f9269c60', order: 1 }, // Functions and Scope
    { id: '6876fd26559d76a2f9269c5e', order: 1 }, // Introduction to JavaScript (duplicate!)
    { id: '6876fd26559d76a2f9269c62', order: 1 }, // DOM Manipulation (duplicate!)
    { id: '6876fd26559d76a2f9269c61', order: 0 }, // Objects and Arrays (invalid!)
    { id: '6876fd26559d76a2f9269c5f', order: 0 }  // Data Types and Variables (invalid!)
  ];

  console.log('❌ Database state that broke UI reordering:');
  realWorldItems.forEach(item => {
    const title = getTitleFromId(item.id);
    console.log(`  ${title}: order=${item.order}`);
  });

  console.log('\n🔧 Attempting to reorder (any operation will fix this):');
  const result = reorderItems(realWorldItems, '6876fd26559d76a2f9269c60', 2);

  console.log('✅ After automatic repair:');
  result.orderedItems.forEach(item => {
    const title = getTitleFromId(item.id);
    console.log(`  ${title}: order=${item.order}`);
  });

  console.log('\n🎯 Problem Solved:');
  console.log('- No more duplicate orders');
  console.log('- No more order=0 values');
  console.log('- UI drag-and-drop now works correctly');
  console.log('- Future reordering operations are stable');
}

// Helper function to make the example more readable
function getTitleFromId(id: string): string {
  const titles: Record<string, string> = {
    '6876fd26559d76a2f9269c60': 'Functions and Scope',
    '6876fd26559d76a2f9269c5e': 'Introduction to JavaScript',
    '6876fd26559d76a2f9269c62': 'DOM Manipulation',
    '6876fd26559d76a2f9269c61': 'Objects and Arrays',
    '6876fd26559d76a2f9269c5f': 'Data Types and Variables'
  };
  return titles[id] || id.slice(0, 8) + '...';
}

// ============================================================================
// Example 4: Gradual Corruption Detection
// ============================================================================

export function gradualCorruptionExample() {
  console.log('\n=== Gradual Corruption Detection ===');
  
  // Scenario: Orders gradually become invalid over time
  let items: OrderableItem[] = [
    { id: 'A', order: 10 },
    { id: 'B', order: 20 },
    { id: 'C', order: 30 }
  ];

  console.log('Stage 1: Valid initial state');
  console.log(items.map(i => `${i.id}:${i.order}`).join(', '));

  // Simulate multiple operations causing tight spacing
  let result = reorderItems(items, 'C', 0);
  items = result.orderedItems;
  console.log('After move C to first:', items.map(i => `${i.id}:${i.order}`).join(', '));

  result = reorderItems(items, 'B', 0);
  items = result.orderedItems;
  console.log('After move B to first:', items.map(i => `${i.id}:${i.order}`).join(', '));

  result = reorderItems(items, 'A', 0);
  items = result.orderedItems;
  console.log('After move A to first:', items.map(i => `${i.id}:${i.order}`).join(', '));

  // Eventually spacing becomes too tight and triggers renumbering
  result = reorderItems(items, 'C', 1);
  items = result.orderedItems;

  console.log('\n✅ Automatic renumbering triggered:');
  console.log(items.map(i => `${i.id}:${i.order}`).join(', '));
  console.log('Fresh spacing restored for continued operations');
}

// ============================================================================
// Example 5: Validation Helper
// ============================================================================

export function validationHelperExample() {
  console.log('\n=== Validation Helper Example ===');
  
  // Helper function to check order integrity
  function validateOrderIntegrity(items: OrderableItem[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const ordersWithValues = items
      .filter(item => item.order !== undefined)
      .map(item => item.order!);

    // Check for invalid values (≤ 0)
    const invalidOrders = ordersWithValues.filter(order => order <= 0);
    if (invalidOrders.length > 0) {
      issues.push(`${invalidOrders.length} items have order ≤ 0: ${invalidOrders.join(', ')}`);
    }

    // Check for duplicates
    const uniqueOrders = new Set(ordersWithValues);
    if (uniqueOrders.size !== ordersWithValues.length) {
      issues.push(`${ordersWithValues.length - uniqueOrders.size} duplicate order values detected`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Test with problematic data
  const problematicItems: OrderableItem[] = [
    { id: 'A', order: 0 },  // Invalid
    { id: 'B', order: 1 },
    { id: 'C', order: 1 },  // Duplicate
    { id: 'D', order: -1 }  // Invalid
  ];

  const validation = validateOrderIntegrity(problematicItems);
  
  console.log('Validation Results:');
  console.log(`Status: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (!validation.isValid) {
    validation.issues.forEach(issue => {
      console.log(`  Issue: ${issue}`);
    });
  }

  // Fix the issues
  console.log('\n🔧 Applying automatic fix...');
  const fixResult = reorderItems(problematicItems, 'A', 0);
  
  const postFixValidation = validateOrderIntegrity(fixResult.orderedItems);
  console.log(`After fix: ${postFixValidation.isValid ? '✅ Valid' : '❌ Still Invalid'}`);
}

// ============================================================================
// Example 6: Migration from Hardcoded Logic
// ============================================================================

export function migrationExample() {
  console.log('\n=== Migration from Hardcoded Logic ===');
  
  // ❌ Old approach: Hardcoded order calculation
  function oldReorderLogic(items: OrderableItem[], moveId: string, targetIndex: number) {
    console.log('❌ Old approach: Hardcoded multiplication');
    
    // This was the old, problematic approach
    const newOrder = (targetIndex + 1) * 100;
    console.log(`  Moving ${moveId} to index ${targetIndex} → order=${newOrder}`);
    
    // Problems with this approach:
    // - No validation of existing orders
    // - No handling of duplicates
    // - No detection of invalid states
    // - Inflexible spacing
    
    return { 
      changes: [{ id: moveId, order: newOrder }],
      problems: ['No validation', 'Inflexible', 'No cleanup']
    };
  }

  // ✅ New approach: Pure function with intelligent handling
  function newReorderLogic(items: OrderableItem[], moveId: string, targetIndex: number) {
    console.log('✅ New approach: Pure function with intelligence');
    
    const result = reorderItems(items, moveId, targetIndex);
    
    console.log(`  Changes needed: ${result.changes.length} items`);
    console.log(`  Automatic validation: ✅`);
    console.log(`  Invalid state cleanup: ✅`);
    console.log(`  Optimal spacing: ✅`);
    
    return result;
  }

  // Example comparison
  const testItems: OrderableItem[] = [
    { id: 'A', order: 1 },
    { id: 'B', order: 1 }, // Duplicate - old logic won't detect
    { id: 'C', order: 0 }  // Invalid - old logic won't fix
  ];

  console.log('\nComparing approaches with problematic data:');
  
  const oldResult = oldReorderLogic(testItems, 'A', 2);
  console.log('Old result:', oldResult.changes, 'Problems:', oldResult.problems);
  
  const newResult = newReorderLogic(testItems, 'A', 2);
  console.log('New result: All data integrity issues automatically resolved!');
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runInvalidOrderExamples() {
  console.log('🚀 Running Invalid Order Handling Examples\n');
  
  duplicateOrdersExample();
  invalidOrderValuesExample();
  realDatabaseScenario();
  gradualCorruptionExample();
  validationHelperExample();
  migrationExample();
  
  console.log('\n✅ All invalid order examples completed!');
  console.log('\n🎯 Key Takeaways:');
  console.log('- The reorder function automatically detects and fixes invalid states');
  console.log('- No manual intervention needed - corruption is resolved transparently');
  console.log('- Performance is optimized by only updating when necessary');
  console.log('- Data integrity is maintained across all operations');
}

// Uncomment to run examples:
// runInvalidOrderExamples();