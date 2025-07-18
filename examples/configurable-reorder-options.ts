/**
 * Configurable Reorder Options Examples
 * 
 * This file demonstrates how to use the configurable options
 * in the reorderItems function to customize ordering behavior.
 */

import { reorderItems, type OrderableItem, type ReorderOptions } from '@thaitype/reorder';

// ============================================================================
// Example 1: Default Behavior (Backward Compatibility)
// ============================================================================

export function defaultBehaviorExample() {
  console.log('=== Default Behavior Example ===');
  
  const items: OrderableItem[] = [
    { id: 'A', order: 100 },
    { id: 'B', order: 200 },
    { id: 'C', order: 300 }
  ];

  // Using default options (same as before)
  const result = reorderItems(items, 'C', 0);
  
  console.log('Default options result:');
  console.log('Changes:', result.changes);
  // Output: [{ id: 'C', order: 99 }]
  
  console.log('Final order:', result.orderedItems.map(i => `${i.id}:${i.order}`));
  // Output: ['C:99', 'A:100', 'B:200']
}

// ============================================================================
// Example 2: Custom Minimum Order Value
// ============================================================================

export function customMinimumOrderExample() {
  console.log('\n=== Custom Minimum Order Value ===');
  
  const items: OrderableItem[] = [
    { id: 'A', order: 50 },
    { id: 'B', order: 100 }
  ];

  // Use custom minimum order value of 10
  const options: ReorderOptions = {
    minOrderValue: 10
  };

  const result = reorderItems(items, 'B', 0, options);
  
  console.log('Custom minOrderValue (10) result:');
  console.log('Changes:', result.changes);
  // Output: [{ id: 'B', order: 49 }] - max(10, 50-1) = 49
  
  // Example with minimum enforcement
  const itemsWithLowOrder: OrderableItem[] = [
    { id: 'A', order: 5 }, // Below minimum of 10
    { id: 'B', order: 15 }
  ];

  const resultWithEnforcement = reorderItems(itemsWithLowOrder, 'B', 0, {
    minOrderValue: 10,
    renumberGap: 20
  });
  
  console.log('Minimum enforcement result:');
  console.log('Changes:', resultWithEnforcement.changes);
  // Output: All items renumbered because A has order 5 < 10
}

// ============================================================================
// Example 3: Custom Renumber Gap
// ============================================================================

export function customRenumberGapExample() {
  console.log('\n=== Custom Renumber Gap ===');
  
  const items: OrderableItem[] = [
    { id: 'A', order: 0 }, // Invalid - triggers renumbering
    { id: 'B', order: 1 },
    { id: 'C', order: 2 }
  ];

  // Use large gaps when renumbering
  const options: ReorderOptions = {
    renumberGap: 100
  };

  const result = reorderItems(items, 'A', 2, options);
  
  console.log('Custom renumberGap (100) result:');
  console.log('Changes:', result.changes);
  // Output: [{ id: 'B', order: 100 }, { id: 'C', order: 200 }, { id: 'A', order: 300 }]
  
  console.log('Final orders with large gaps:');
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: ${item.order}`);
  });
  // Output: B:100, C:200, A:300 (plenty of space for future insertions)
}

// ============================================================================
// Example 4: Custom Minimum Gap Detection
// ============================================================================

export function customMinimumGapExample() {
  console.log('\n=== Custom Minimum Gap Detection ===');
  
  const items: OrderableItem[] = [
    { id: 'A', order: 100 },
    { id: 'B', order: 100.4 }, // Gap of 0.4
    { id: 'C', order: 200 }
  ];

  // Default behavior (minOrderGap: 0.1)
  const defaultResult = reorderItems(items, 'C', 1);
  console.log('Default minOrderGap result:');
  console.log('Changes:', defaultResult.changes);
  // Output: [{ id: 'C', order: 100.2 }] - Single change

  // Custom larger minimum gap requirement
  const options: ReorderOptions = {
    minOrderGap: 0.5, // Require larger gaps
    renumberGap: 50
  };

  const customResult = reorderItems(items, 'C', 1, options);
  console.log('Custom minOrderGap (0.5) result:');
  console.log('Changes:', customResult.changes);
  // Output: All items renumbered because gap of 0.2 < 0.5
  
  console.log('Renumbered with proper spacing:');
  customResult.orderedItems.forEach(item => {
    console.log(`  ${item.id}: ${item.order}`);
  });
}

// ============================================================================
// Example 5: Combined Custom Options
// ============================================================================

export function combinedOptionsExample() {
  console.log('\n=== Combined Custom Options ===');
  
  const items: OrderableItem[] = [
    { id: 'Chapter1', order: 3 }, // Below custom minimum
    { id: 'Chapter2', order: 8 }
  ];

  // Use all custom options together
  const options: ReorderOptions = {
    minOrderValue: 5,    // Must be >= 5
    renumberGap: 25,     // Use gaps of 25
    minOrderGap: 2.0     // Require gaps of at least 2.0
  };

  const result = reorderItems(items, 'Chapter2', 0, options);
  
  console.log('Combined options result:');
  console.log('Changes:', result.changes);
  // Output: All items renumbered due to Chapter1 having order 3 < 5
  
  console.log('Final result with all custom settings:');
  result.orderedItems.forEach(item => {
    console.log(`  ${item.id}: ${item.order}`);
  });
  // Output: Chapter2:25, Chapter1:50 (meets all requirements)
}

// ============================================================================
// Example 6: Different Use Cases for Custom Options
// ============================================================================

export function useCaseExamples() {
  console.log('\n=== Different Use Cases ===');
  
  // Use Case 1: High-precision scientific data
  console.log('Scientific data ordering:');
  const scientificData: OrderableItem[] = [
    { id: 'experiment_a', order: 1.001 },
    { id: 'experiment_b', order: 1.002 }
  ];
  
  const precisionResult = reorderItems(scientificData, 'experiment_b', 0, {
    minOrderValue: 0.001,  // Allow very small values
    minOrderGap: 0.0001,   // Require tiny gaps
    renumberGap: 0.1       // Small renumber gaps
  });
  
  console.log('Precision ordering result:', precisionResult.changes);
  
  // Use Case 2: Large-scale enterprise system
  console.log('\nEnterprise system ordering:');
  const enterpriseItems: OrderableItem[] = [
    { id: 'process_1', order: 1000 },
    { id: 'process_2', order: 2000 }
  ];
  
  const enterpriseResult = reorderItems(enterpriseItems, 'process_2', 0, {
    minOrderValue: 1000,   // High minimum values
    minOrderGap: 100,      // Large gap requirements
    renumberGap: 10000     // Very large renumber gaps
  });
  
  console.log('Enterprise ordering result:', enterpriseResult.changes);
  
  // Use Case 3: UI component ordering
  console.log('\nUI component ordering:');
  const uiComponents: OrderableItem[] = [
    { id: 'header', order: 10 },
    { id: 'content', order: 20 },
    { id: 'footer', order: 30 }
  ];
  
  const uiResult = reorderItems(uiComponents, 'footer', 0, {
    minOrderValue: 1,      // Standard minimum
    minOrderGap: 1,        // Integer gaps preferred
    renumberGap: 10        // Clean multiples of 10
  });
  
  console.log('UI component ordering result:', uiResult.changes);
}

// ============================================================================
// Example 7: Migration from Hardcoded Values
// ============================================================================

export function migrationExample() {
  console.log('\n=== Migration Example ===');
  
  // Before: Hardcoded values in legacy system
  const legacyItems: OrderableItem[] = [
    { id: 'legacy_a', order: 1 },
    { id: 'legacy_b', order: 2 },
    { id: 'legacy_c', order: 3 }
  ];
  
  // Migrate to new system with custom spacing
  const migratedResult = reorderItems(legacyItems, 'legacy_c', 0, {
    minOrderValue: 100,    // Start at 100 for new system
    renumberGap: 100,      // Use consistent gaps
    minOrderGap: 10        // Ensure adequate spacing
  });
  
  console.log('Migration result:');
  console.log('Changes:', migratedResult.changes);
  
  console.log('Migrated to new numbering system:');
  migratedResult.orderedItems.forEach(item => {
    console.log(`  ${item.id}: ${item.order}`);
  });
  // Output: legacy_c:100, legacy_a:200, legacy_b:300
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runConfigurableOptionsExamples() {
  console.log('🚀 Running Configurable Reorder Options Examples\n');
  
  defaultBehaviorExample();
  customMinimumOrderExample();
  customRenumberGapExample();
  customMinimumGapExample();
  combinedOptionsExample();
  useCaseExamples();
  migrationExample();
  
  console.log('\n✅ All configurable options examples completed!');
  console.log('\n🎯 Key Benefits:');
  console.log('- Flexible minimum order values for different systems');
  console.log('- Configurable spacing for different precision requirements');
  console.log('- Customizable gap detection for different use cases');
  console.log('- Backward compatibility with existing code');
  console.log('- Easy migration from legacy numbering systems');
}

// Uncomment to run examples:
// runConfigurableOptionsExamples();