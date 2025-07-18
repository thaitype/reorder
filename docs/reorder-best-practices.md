# Reorder Function Best Practices

This document outlines best practices, integration patterns, and performance considerations for using the pure reorder function in production environments.

## Table of Contents

- [Integration Patterns](#integration-patterns)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Testing Strategies](#testing-strategies)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Common Pitfalls](#common-pitfalls)
- [Security Considerations](#security-considerations)

## Integration Patterns

### 1. Repository Layer Pattern ✅

**Recommended approach for database integration:**

```typescript
class CourseRepository {
  async reorderChapters(courseId: string, chapterIds: string[], context: RepositoryContext) {
    // 1. Fetch current data
    const course = await this.findById(courseId);
    
    // 2. Convert to OrderableItem format
    const orderableItems = course.chapters.map(ch => ({
      id: ch.id.toString(),
      order: ch.order
    }));
    
    // 3. Detect moved item (optimization)
    const { movedId, newPosition } = this.detectMovedItem(orderableItems, chapterIds);
    if (!movedId) return; // No changes needed
    
    // 4. Apply pure function
    const result = reorderItems(orderableItems, movedId, newPosition);
    
    // 5. Apply minimal database updates
    for (const change of result.changes) {
      await this.updateItemOrder(change.id, change.order, context);
    }
  }
  
  private detectMovedItem(items: OrderableItem[], newOrder: string[]) {
    const currentOrder = sortItemsByOrder(items).map(item => item.id);
    
    for (let i = 0; i < newOrder.length; i++) {
      if (currentOrder[i] !== newOrder[i]) {
        return { movedId: newOrder[i], newPosition: i };
      }
    }
    return { movedId: null, newPosition: -1 };
  }
}
```

**Benefits:**
- Minimal database updates (only changed items)
- Automatic invalid state cleanup
- Clear separation of concerns

### 2. Service Layer Abstraction ✅

**Recommended for complex business logic:**

```typescript
class ReorderService {
  async reorderContent(
    contentType: 'chapters' | 'lessons' | 'sublessons',
    contentId: string,
    itemIds: string[],
    userId: string
  ) {
    // Validation
    await this.validateReorderPermissions(contentType, contentId, userId);
    
    // Delegate to appropriate repository
    switch (contentType) {
      case 'chapters':
        return await this.courseRepository.reorderChapters(contentId, itemIds, { operatedBy: userId });
      case 'lessons':
        return await this.lessonRepository.reorderLessons(contentId, itemIds, { operatedBy: userId });
      case 'sublessons':
        return await this.lessonRepository.reorderSubLessons(contentId, itemIds, { operatedBy: userId });
    }
  }
}
```

### 3. Transaction Management ✅

**For data consistency across multiple updates:**

```typescript
async reorderWithTransaction(items: OrderableItem[], moveId: string, targetIndex: number) {
  const session = await this.db.startSession();
  
  try {
    await session.withTransaction(async () => {
      const result = reorderItems(items, moveId, targetIndex);
      
      // Apply all changes within transaction
      for (const change of result.changes) {
        await this.updateItemOrder(change.id, change.order, { session });
      }
    });
  } finally {
    await session.endSession();
  }
}
```

## Performance Optimization

### 1. Minimize Database Calls 🚀

**Do:**
```typescript
// ✅ Only update changed items
const result = reorderItems(items, moveId, targetIndex);
for (const change of result.changes) {
  await updateItem(change.id, change.order);
}
```

**Don't:**
```typescript
// ❌ Update all items unnecessarily
for (let i = 0; i < items.length; i++) {
  await updateItem(items[i].id, (i + 1) * 100);
}
```

### 2. Batch Database Updates 🚀

**For multiple changes:**

```typescript
async applyChangesBatch(changes: { id: string; order: number }[]) {
  // Batch multiple updates into single database call
  const bulkOps = changes.map(change => ({
    updateOne: {
      filter: { _id: new ObjectId(change.id) },
      update: { $set: { order: change.order } }
    }
  }));
  
  await this.collection.bulkWrite(bulkOps);
}
```

### 3. Index Optimization 📊

**Database indexes for optimal performance:**

```sql
-- Index on order field for fast sorting
CREATE INDEX idx_chapters_order ON chapters(order);
CREATE INDEX idx_lessons_course_chapter_order ON lessons(courseId, chapterId, order);

-- Compound indexes for common queries
CREATE INDEX idx_lessons_lookup ON lessons(courseId, chapterId, order, _id);
```

### 4. Caching Strategy 💾

**Cache frequently accessed order data:**

```typescript
class CachedReorderService {
  private orderCache = new Map<string, OrderableItem[]>();
  
  async getOrderableItems(contextId: string): Promise<OrderableItem[]> {
    if (this.orderCache.has(contextId)) {
      return this.orderCache.get(contextId)!;
    }
    
    const items = await this.fetchFromDatabase(contextId);
    this.orderCache.set(contextId, items);
    return items;
  }
  
  async reorderWithCache(contextId: string, moveId: string, targetIndex: number) {
    const items = await this.getOrderableItems(contextId);
    const result = reorderItems(items, moveId, targetIndex);
    
    // Update cache with new order
    this.orderCache.set(contextId, result.orderedItems);
    
    // Apply to database
    await this.applyChanges(result.changes);
  }
}
```

## Error Handling

### 1. Input Validation 🛡️

**Comprehensive validation strategy:**

```typescript
class ReorderValidator {
  static validateReorderRequest(items: OrderableItem[], moveId: string, targetIndex: number) {
    // Check for empty array
    if (!items || items.length === 0) {
      throw new ValidationError('Items array cannot be empty');
    }
    
    // Check for valid moveId
    if (!moveId || typeof moveId !== 'string') {
      throw new ValidationError('moveId must be a non-empty string');
    }
    
    // Check if item exists
    const itemExists = items.some(item => item.id === moveId);
    if (!itemExists) {
      throw new ValidationError(`Item with id "${moveId}" not found`);
    }
    
    // Check target index bounds
    if (targetIndex < 0 || targetIndex >= items.length) {
      throw new ValidationError(`targetIndex ${targetIndex} is out of bounds for array of length ${items.length}`);
    }
    
    // Check for duplicate IDs
    const ids = items.map(item => item.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new ValidationError('Duplicate item IDs detected');
    }
  }
}
```

### 2. Graceful Degradation 🔄

**Handle partial failures gracefully:**

```typescript
async reorderWithFallback(items: OrderableItem[], moveId: string, targetIndex: number) {
  try {
    // Attempt optimal reordering
    const result = reorderItems(items, moveId, targetIndex);
    await this.applyChanges(result.changes);
    
    return { success: true, method: 'optimal' };
    
  } catch (error) {
    if (error instanceof ValidationError) {
      // For validation errors, attempt to fix data first
      const cleanedItems = await this.cleanInvalidOrders(items);
      const result = reorderItems(cleanedItems, moveId, targetIndex);
      await this.applyChanges(result.changes);
      
      return { success: true, method: 'cleaned' };
    }
    
    // For other errors, fall back to simple renumbering
    await this.fallbackRenumber(items, moveId, targetIndex);
    return { success: true, method: 'fallback' };
  }
}
```

### 3. Error Recovery 🔧

**Automated recovery from invalid states:**

```typescript
class OrderRecoveryService {
  async detectAndRepairOrderIssues(contextId: string): Promise<RepairResult> {
    const items = await this.getItems(contextId);
    const issues = this.analyzeOrderIntegrity(items);
    
    if (issues.length === 0) {
      return { repaired: false, issues: [] };
    }
    
    // Trigger repair by doing any reorder operation
    const firstItem = items[0];
    const result = reorderItems(items, firstItem.id, 0);
    
    // Apply the repairs
    await this.applyChanges(result.changes);
    
    return {
      repaired: true,
      issues,
      changesApplied: result.changes.length
    };
  }
  
  private analyzeOrderIntegrity(items: OrderableItem[]): string[] {
    const issues: string[] = [];
    const orders = items.filter(i => i.order !== undefined).map(i => i.order!);
    
    // Check for invalid orders
    const invalidOrders = orders.filter(order => order <= 0);
    if (invalidOrders.length > 0) {
      issues.push(`${invalidOrders.length} items have invalid orders (≤ 0)`);
    }
    
    // Check for duplicates
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      issues.push(`${orders.length - uniqueOrders.size} duplicate order values`);
    }
    
    return issues;
  }
}
```

## Testing Strategies

### 1. Unit Testing 🧪

**Comprehensive test coverage:**

```typescript
describe('Reorder Function', () => {
  describe('Basic Operations', () => {
    it('should move item to new position', () => {
      const items = [
        { id: 'A', order: 100 },
        { id: 'B', order: 200 },
        { id: 'C', order: 300 }
      ];
      
      const result = reorderItems(items, 'C', 0);
      
      expect(result.changes).toEqual([{ id: 'C', order: 99 }]);
      expect(result.orderedItems[0].id).toBe('C');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle invalid order cleanup', () => {
      const items = [
        { id: 'A', order: 0 },    // Invalid
        { id: 'B', order: 1 },
        { id: 'C', order: 1 }     // Duplicate
      ];
      
      const result = reorderItems(items, 'A', 1);
      
      // Should renumber all items
      expect(result.changes).toHaveLength(3);
      expect(result.orderedItems.every(item => item.order! >= 1)).toBe(true);
    });
  });
  
  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        order: i * 10
      }));
      
      const startTime = performance.now();
      const result = reorderItems(items, 'item-5000', 0);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
      expect(result.changes).toHaveLength(1); // Only one change needed
    });
  });
});
```

### 2. Integration Testing 🔗

**Test repository integration:**

```typescript
describe('Repository Integration', () => {
  let repository: CourseRepository;
  let testDb: Database;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    repository = new CourseRepository(testDb);
  });
  
  it('should reorder chapters and update database', async () => {
    // Setup test data
    const course = await repository.createCourse({
      title: 'Test Course',
      chapters: [
        { title: 'Chapter 1', order: 100 },
        { title: 'Chapter 2', order: 200 },
        { title: 'Chapter 3', order: 300 }
      ]
    });
    
    // Reorder chapters
    const chapterIds = course.chapters.map(ch => ch.id);
    await repository.reorderChapters(course.id, [chapterIds[2], chapterIds[0], chapterIds[1]]);
    
    // Verify database state
    const updatedCourse = await repository.findById(course.id);
    const orderedChapters = updatedCourse.chapters.sort((a, b) => a.order - b.order);
    
    expect(orderedChapters[0].title).toBe('Chapter 3');
    expect(orderedChapters[1].title).toBe('Chapter 1');
    expect(orderedChapters[2].title).toBe('Chapter 2');
  });
});
```

### 3. Property-Based Testing 🎲

**Test with random data:**

```typescript
import { fc } from 'fast-check';

describe('Property-Based Testing', () => {
  it('should maintain item count after reordering', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.string({ minLength: 1 }),
        order: fc.option(fc.float({ min: 1, max: 1000 }))
      }), { minLength: 1, maxLength: 100 }),
      fc.integer(),
      (items, targetIndex) => {
        // Ensure unique IDs
        const uniqueItems = items.filter((item, index, arr) => 
          arr.findIndex(i => i.id === item.id) === index
        );
        
        if (uniqueItems.length === 0) return true;
        
        const validTargetIndex = Math.abs(targetIndex) % uniqueItems.length;
        const moveId = uniqueItems[0].id;
        
        const result = reorderItems(uniqueItems, moveId, validTargetIndex);
        
        // Item count should remain the same
        expect(result.orderedItems).toHaveLength(uniqueItems.length);
        
        // All original items should be present
        const originalIds = new Set(uniqueItems.map(i => i.id));
        const resultIds = new Set(result.orderedItems.map(i => i.id));
        expect(resultIds).toEqual(originalIds);
      }
    ));
  });
});
```

## Monitoring and Debugging

### 1. Performance Metrics 📊

**Track reorder operation performance:**

```typescript
class ReorderMetrics {
  private metrics = {
    totalOperations: 0,
    averageTime: 0,
    renumberingRate: 0,
    errorRate: 0
  };
  
  async reorderWithMetrics(items: OrderableItem[], moveId: string, targetIndex: number) {
    const startTime = performance.now();
    this.metrics.totalOperations++;
    
    try {
      const result = reorderItems(items, moveId, targetIndex);
      const endTime = performance.now();
      
      // Update metrics
      const operationTime = endTime - startTime;
      this.updateAverageTime(operationTime);
      
      if (result.changes.length > 1) {
        this.metrics.renumberingRate++;
      }
      
      // Log slow operations
      if (operationTime > 100) {
        console.warn('Slow reorder operation:', {
          time: operationTime,
          itemCount: items.length,
          changesCount: result.changes.length
        });
      }
      
      return result;
      
    } catch (error) {
      this.metrics.errorRate++;
      throw error;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      renumberingRate: this.metrics.renumberingRate / this.metrics.totalOperations,
      errorRate: this.metrics.errorRate / this.metrics.totalOperations
    };
  }
}
```

### 2. Debug Logging 🔍

**Detailed logging for troubleshooting:**

```typescript
class DebugReorderService {
  private logger: Logger;
  
  async reorderWithDebugLogging(items: OrderableItem[], moveId: string, targetIndex: number) {
    this.logger.debug('Reorder operation starting', {
      itemCount: items.length,
      moveId,
      targetIndex,
      hasInvalidOrders: this.hasInvalidOrders(items)
    });
    
    // Log pre-reorder state
    this.logger.debug('Pre-reorder state', {
      items: items.map(i => ({ id: i.id, order: i.order }))
    });
    
    const result = reorderItems(items, moveId, targetIndex);
    
    // Log post-reorder state
    this.logger.debug('Reorder completed', {
      changesCount: result.changes.length,
      renumberingTriggered: result.changes.length > 1,
      changes: result.changes
    });
    
    return result;
  }
  
  private hasInvalidOrders(items: OrderableItem[]): boolean {
    const orders = items.filter(i => i.order !== undefined).map(i => i.order!);
    const hasInvalid = orders.some(order => order <= 0);
    const hasDuplicates = new Set(orders).size !== orders.length;
    return hasInvalid || hasDuplicates;
  }
}
```

### 3. Health Checks 🏥

**Monitor data integrity:**

```typescript
class OrderHealthCheck {
  async checkOrderHealth(contextType: string, contextId: string): Promise<HealthStatus> {
    const items = await this.getItems(contextType, contextId);
    const issues: string[] = [];
    
    // Check for invalid orders
    const invalidCount = items.filter(i => i.order !== undefined && i.order <= 0).length;
    if (invalidCount > 0) {
      issues.push(`${invalidCount} items have invalid orders`);
    }
    
    // Check for duplicates
    const orders = items.filter(i => i.order !== undefined).map(i => i.order!);
    const duplicateCount = orders.length - new Set(orders).size;
    if (duplicateCount > 0) {
      issues.push(`${duplicateCount} duplicate order values`);
    }
    
    // Check for tight spacing
    const sortedOrders = orders.sort((a, b) => a - b);
    let tightSpacingCount = 0;
    for (let i = 1; i < sortedOrders.length; i++) {
      if (sortedOrders[i] - sortedOrders[i-1] < 0.1) {
        tightSpacingCount++;
      }
    }
    
    if (tightSpacingCount > 0) {
      issues.push(`${tightSpacingCount} items have tight spacing`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      itemCount: items.length,
      lastChecked: new Date()
    };
  }
}
```

## Common Pitfalls

### ❌ Don't: Update All Items

```typescript
// ❌ Bad: Updates all items unnecessarily
async reorderBad(items: OrderableItem[], moveId: string, targetIndex: number) {
  // Hardcoded approach - inefficient
  for (let i = 0; i < items.length; i++) {
    await updateItemOrder(items[i].id, (i + 1) * 100);
  }
}
```

### ✅ Do: Use Pure Function Result

```typescript
// ✅ Good: Only update changed items
async reorderGood(items: OrderableItem[], moveId: string, targetIndex: number) {
  const result = reorderItems(items, moveId, targetIndex);
  
  // Only update items that actually changed
  for (const change of result.changes) {
    await updateItemOrder(change.id, change.order);
  }
}
```

### ❌ Don't: Ignore Invalid States

```typescript
// ❌ Bad: Ignore duplicate/invalid orders
async reorderIgnoringIssues(items: OrderableItem[]) {
  // These items have order=0 and duplicates - will cause UI issues
  // [{ id: 'A', order: 0 }, { id: 'B', order: 1 }, { id: 'C', order: 1 }]
  
  // Manual calculation without validation
  return items.map((item, index) => ({
    ...item,
    order: (index + 1) * 100 // Doesn't fix underlying issues
  }));
}
```

### ✅ Do: Trust the Pure Function

```typescript
// ✅ Good: Let pure function handle invalid states
async reorderWithValidation(items: OrderableItem[], moveId: string, targetIndex: number) {
  // Pure function automatically detects and fixes:
  // - Order values ≤ 0
  // - Duplicate orders
  // - Tight spacing
  
  const result = reorderItems(items, moveId, targetIndex);
  
  // All issues are automatically resolved
  return result;
}
```

## Security Considerations

### 1. Permission Validation 🔒

**Always validate user permissions:**

```typescript
class SecureReorderService {
  async reorderWithPermissionCheck(
    userId: string,
    resourceType: string,
    resourceId: string,
    itemIds: string[]
  ) {
    // Verify user has permission to reorder this resource
    const hasPermission = await this.checkReorderPermission(userId, resourceType, resourceId);
    if (!hasPermission) {
      throw new ForbiddenError('User does not have permission to reorder this content');
    }
    
    // Verify all item IDs belong to the resource
    const validItems = await this.validateItemOwnership(resourceId, itemIds);
    if (validItems.length !== itemIds.length) {
      throw new ValidationError('Some items do not belong to this resource');
    }
    
    // Proceed with reordering
    return await this.performReorder(validItems, itemIds);
  }
}
```

### 2. Input Sanitization 🛡️

**Sanitize and validate all inputs:**

```typescript
class InputSanitizer {
  static sanitizeReorderInput(input: any): { items: OrderableItem[]; moveId: string; targetIndex: number } {
    // Validate and sanitize items array
    if (!Array.isArray(input.items)) {
      throw new ValidationError('items must be an array');
    }
    
    const sanitizedItems = input.items.map((item: any) => {
      if (typeof item.id !== 'string' || item.id.length === 0) {
        throw new ValidationError('All items must have valid string IDs');
      }
      
      return {
        id: item.id.trim(),
        order: typeof item.order === 'number' && item.order > 0 ? item.order : undefined
      };
    });
    
    // Validate moveId
    if (typeof input.moveId !== 'string' || input.moveId.length === 0) {
      throw new ValidationError('moveId must be a non-empty string');
    }
    
    // Validate targetIndex
    const targetIndex = parseInt(input.targetIndex);
    if (isNaN(targetIndex) || targetIndex < 0) {
      throw new ValidationError('targetIndex must be a non-negative integer');
    }
    
    return {
      items: sanitizedItems,
      moveId: input.moveId.trim(),
      targetIndex
    };
  }
}
```

### 3. Rate Limiting ⏱️

**Prevent abuse through rate limiting:**

```typescript
class RateLimitedReorderService {
  private reorderCounts = new Map<string, { count: number; resetTime: number }>();
  
  async reorderWithRateLimit(userId: string, ...reorderArgs: any[]) {
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute
    const maxReorders = 10; // Max 10 reorders per minute
    
    // Check current rate limit
    const userStats = this.reorderCounts.get(userId) || { count: 0, resetTime: now + windowSize };
    
    if (now > userStats.resetTime) {
      // Reset window
      userStats.count = 0;
      userStats.resetTime = now + windowSize;
    }
    
    if (userStats.count >= maxReorders) {
      throw new RateLimitError('Too many reorder operations. Please wait before trying again.');
    }
    
    // Increment counter and proceed
    userStats.count++;
    this.reorderCounts.set(userId, userStats);
    
    return await this.performReorder(...reorderArgs);
  }
}
```

## Summary

Following these best practices ensures:

- ✅ **Optimal Performance**: Minimal database updates and efficient algorithms
- ✅ **Data Integrity**: Automatic cleanup of invalid order states
- ✅ **Reliability**: Comprehensive error handling and graceful degradation
- ✅ **Security**: Proper validation and permission checks
- ✅ **Maintainability**: Clear patterns and comprehensive testing
- ✅ **Observability**: Detailed metrics and debugging capabilities

The pure reorder function is designed to handle edge cases automatically, but following these integration patterns ensures you get the most benefit from its capabilities in production environments.