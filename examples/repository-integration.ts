/**
 * Repository Integration Examples
 * 
 * This file demonstrates how to integrate the pure reorder function
 * with repository layers and database operations for optimal performance.
 */

import { ObjectId } from 'mongodb';
import { reorderItems, type OrderableItem } from '@thaitype/reorder';

// ============================================================================
// Example 1: Chapter Reordering in Course Repository
// ============================================================================

/**
 * Example implementation of chapter reordering in MongoCourseRepository
 * This shows the complete integration pattern used in the academy platform.
 */
export class ExampleCourseRepository {
  
  async reorderChapters(courseId: string, chapterIds: string[], context: any): Promise<void> {
    console.log('=== Chapter Reordering Integration ===');
    
    // Step 1: Get current course data from database
    console.log('1️⃣ Fetching current course data...');
    const course = await this.getCourseFromDb(courseId);
    if (!course || !course.chapters) {
      throw new Error('Course not found or has no chapters');
    }

    // Step 2: Validate all chapter IDs exist
    console.log('2️⃣ Validating chapter IDs...');
    for (const chapterId of chapterIds) {
      const exists = course.chapters.some(ch => ch.id.toString() === chapterId);
      if (!exists) {
        throw new Error(`Chapter ${chapterId} not found in course ${courseId}`);
      }
    }

    // Step 3: Convert to OrderableItem format for pure function
    console.log('3️⃣ Converting to OrderableItem format...');
    const orderableChapters: OrderableItem[] = course.chapters.map(chapter => ({
      id: chapter.id.toString(),
      order: chapter.order,
    }));

    // Step 4: Determine which item moved and where
    console.log('4️⃣ Detecting moved item...');
    const currentOrder = [...course.chapters]
      .sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER))
      .map(ch => ch.id.toString());
    
    let movedChapterId: string | null = null;
    let newPosition = -1;
    
    for (let i = 0; i < chapterIds.length; i++) {
      if (currentOrder[i] !== chapterIds[i]) {
        movedChapterId = chapterIds[i];
        newPosition = i;
        break;
      }
    }

    if (!movedChapterId) {
      console.log('⏭️ No changes needed - chapters already in correct order');
      return;
    }

    console.log(`📦 Moving chapter ${movedChapterId} to position ${newPosition}`);

    // Step 5: Use pure reorder function
    console.log('5️⃣ Calculating reorder changes...');
    const reorderResult = reorderItems(orderableChapters, movedChapterId, newPosition);

    console.log(`📊 Changes needed: ${reorderResult.changes.length} items`);
    if (reorderResult.changes.length > 1) {
      console.log('🔄 Renumbering triggered - invalid order values detected and fixed');
    }

    // Step 6: Apply minimal database updates
    console.log('6️⃣ Applying database updates...');
    for (const change of reorderResult.changes) {
      await this.updateChapterOrder(courseId, change.id, change.order, context);
      console.log(`  ✅ Updated chapter ${change.id} to order ${change.order}`);
    }

    console.log('🎉 Chapter reordering completed successfully!');
  }

  // Simulated database methods
  private async getCourseFromDb(courseId: string) {
    // Simulated course data with problematic orders
    return {
      _id: new ObjectId(courseId),
      chapters: [
        { id: new ObjectId('chap1'), title: 'Introduction', order: 1 },
        { id: new ObjectId('chap2'), title: 'Basics', order: 1 },        // Duplicate!
        { id: new ObjectId('chap3'), title: 'Advanced', order: 0 },      // Invalid!
        { id: new ObjectId('chap4'), title: 'Conclusion', order: 2 }
      ]
    };
  }

  private async updateChapterOrder(courseId: string, chapterId: string, order: number, context: any) {
    console.log(`    📝 DB UPDATE: SET chapters[${chapterId}].order = ${order}`);
    // In real implementation: MongoDB positional update
    // await this.collection.updateOne(
    //   { _id: new ObjectId(courseId), "chapters.id": new ObjectId(chapterId) },
    //   { $set: { "chapters.$.order": order } }
    // );
  }
}

// ============================================================================
// Example 2: Lesson Reordering with Error Handling
// ============================================================================

export class ExampleLessonRepository {
  
  async reorderLessons(courseId: string, chapterId: string, lessonIds: string[], context: any): Promise<void> {
    console.log('\n=== Lesson Reordering with Error Handling ===');
    
    try {
      // Step 1: Fetch lessons for the chapter
      console.log('1️⃣ Fetching lessons...');
      const lessons = await this.getLessonsFromDb(courseId, chapterId);
      
      if (lessons.length === 0) {
        console.log('⚠️ No lessons found for chapter');
        return;
      }

      // Step 2: Convert and validate
      console.log('2️⃣ Converting to OrderableItem format...');
      const orderableLessons: OrderableItem[] = lessons.map(lesson => ({
        id: lesson._id.toString(),
        order: lesson.order,
      }));

      // Step 3: Detect changes
      const currentOrder = orderableLessons
        .sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER))
        .map(l => l.id);
      
      let movedLessonId: string | null = null;
      let newPosition = -1;
      
      for (let i = 0; i < lessonIds.length; i++) {
        if (currentOrder[i] !== lessonIds[i]) {
          movedLessonId = lessonIds[i];
          newPosition = i;
          break;
        }
      }

      if (!movedLessonId) {
        console.log('⏭️ No changes needed');
        return;
      }

      // Step 4: Apply reorder function with error handling
      console.log('4️⃣ Applying reorder logic...');
      const reorderResult = reorderItems(orderableLessons, movedLessonId, newPosition);

      // Step 5: Database transaction for consistency
      console.log('5️⃣ Starting database transaction...');
      await this.executeInTransaction(async () => {
        for (const change of reorderResult.changes) {
          await this.updateLessonOrder(change.id, change.order, context);
        }
      });

      console.log('✅ Lesson reordering completed successfully!');

    } catch (error) {
      console.error('❌ Lesson reordering failed:', error instanceof Error ? error.message : String(error));
      
      // Log detailed error information for debugging
      console.error('Context:', {
        courseId,
        chapterId,
        lessonIds,
        operation: 'reorderLessons',
        timestamp: new Date().toISOString()
      });
      
      throw error; // Re-throw for upper layers to handle
    }
  }

  private async getLessonsFromDb(courseId: string, chapterId: string) {
    return [
      { _id: new ObjectId('lesson1'), title: 'Lesson 1', order: 100 },
      { _id: new ObjectId('lesson2'), title: 'Lesson 2', order: 200 },
      { _id: new ObjectId('lesson3'), title: 'Lesson 3', order: 300 }
    ];
  }

  private async updateLessonOrder(lessonId: string, order: number, context: any) {
    console.log(`    💾 Updating lesson ${lessonId} order to ${order}`);
  }

  private async executeInTransaction(operation: () => Promise<void>) {
    // Simulated transaction - in real code this would use MongoDB transactions
    console.log('    📀 Transaction started');
    await operation();
    console.log('    ✅ Transaction committed');
  }
}

// ============================================================================
// Example 3: SubLesson Reordering with Nested Updates
// ============================================================================

export class ExampleSubLessonRepository {
  
  async reorderSubLessons(lessonId: string, subLessonIds: string[], context: any): Promise<void> {
    console.log('\n=== SubLesson Reordering (Nested Updates) ===');
    
    // Step 1: Get lesson with sublessons
    console.log('1️⃣ Fetching lesson with sublessons...');
    const lesson = await this.getLessonFromDb(lessonId);
    if (!lesson || !lesson.subLessons) {
      throw new Error('Lesson not found or has no sublessons');
    }

    // Step 2: Validate subLesson IDs
    console.log('2️⃣ Validating subLesson IDs...');
    for (const subLessonId of subLessonIds) {
      const exists = lesson.subLessons.some(sl => sl._id.toString() === subLessonId);
      if (!exists) {
        throw new Error(`SubLesson ${subLessonId} not found in lesson ${lessonId}`);
      }
    }

    // Step 3: Convert to OrderableItem format
    const orderableSubLessons: OrderableItem[] = lesson.subLessons.map(subLesson => ({
      id: subLesson._id.toString(),
      order: subLesson.order,
    }));

    // Step 4: Detect moved item
    const currentOrder = [...lesson.subLessons]
      .sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER))
      .map(sl => sl._id.toString());
    
    let movedSubLessonId: string | null = null;
    let newPosition = -1;
    
    for (let i = 0; i < subLessonIds.length; i++) {
      if (currentOrder[i] !== subLessonIds[i]) {
        movedSubLessonId = subLessonIds[i];
        newPosition = i;
        break;
      }
    }

    if (!movedSubLessonId) {
      console.log('⏭️ No changes needed for sublessons');
      return;
    }

    // Step 5: Apply pure reorder function
    console.log('5️⃣ Calculating subLesson reorder...');
    const reorderResult = reorderItems(orderableSubLessons, movedSubLessonId, newPosition);

    // Step 6: Apply changes using MongoDB positional updates
    console.log('6️⃣ Applying nested document updates...');
    for (const change of reorderResult.changes) {
      await this.updateSubLessonOrder(lessonId, change.id, change.order, context);
    }

    console.log('🎉 SubLesson reordering completed!');
  }

  private async getLessonFromDb(lessonId: string) {
    return {
      _id: new ObjectId(lessonId),
      title: 'Example Lesson',
      subLessons: [
        { _id: new ObjectId('sub1'), title: 'Sub 1', order: 100 },
        { _id: new ObjectId('sub2'), title: 'Sub 2', order: 200 },
        { _id: new ObjectId('sub3'), title: 'Sub 3', order: 300 }
      ]
    };
  }

  private async updateSubLessonOrder(lessonId: string, subLessonId: string, order: number, context: any) {
    console.log(`    🔧 MongoDB positional update: lessons[${lessonId}].subLessons[${subLessonId}].order = ${order}`);
    // Real implementation:
    // await this.collection.updateOne(
    //   { _id: new ObjectId(lessonId), "subLessons._id": new ObjectId(subLessonId) },
    //   { $set: { "subLessons.$.order": order } }
    // );
  }
}

// ============================================================================
// Example 4: Service Layer Integration
// ============================================================================

export class ExampleCourseService {
  
  constructor(
    private courseRepository: ExampleCourseRepository,
    private lessonRepository: ExampleLessonRepository
  ) {}

  async reorderCourseContent(
    courseId: string,
    reorderType: 'chapters' | 'lessons' | 'sublessons',
    itemIds: string[],
    parentId?: string,
    context?: any
  ): Promise<{ success: boolean; changesApplied: number; message: string }> {
    console.log('\n=== Service Layer Integration ===');
    
    try {
      console.log(`🎯 Reordering ${reorderType} for course ${courseId}`);
      
      let changesApplied = 0;
      
      switch (reorderType) {
        case 'chapters':
          console.log('📚 Processing chapter reorder...');
          await this.courseRepository.reorderChapters(courseId, itemIds, context);
          changesApplied = itemIds.length; // Simplified
          break;

        case 'lessons':
          if (!parentId) throw new Error('Chapter ID required for lesson reordering');
          console.log('📄 Processing lesson reorder...');
          await this.lessonRepository.reorderLessons(courseId, parentId, itemIds, context);
          changesApplied = itemIds.length; // Simplified
          break;

        case 'sublessons':
          if (!parentId) throw new Error('Lesson ID required for sublesson reordering');
          console.log('📝 Processing sublesson reorder...');
          // Would call subLesson repository
          changesApplied = itemIds.length; // Simplified
          break;

        default:
          throw new Error(`Unsupported reorder type: ${reorderType}`);
      }

      console.log('✅ Service layer operation completed');
      
      return {
        success: true,
        changesApplied,
        message: `Successfully reordered ${changesApplied} ${reorderType}`
      };

    } catch (error) {
      console.error('❌ Service layer error:', error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        changesApplied: 0,
        message: `Failed to reorder ${reorderType}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// ============================================================================
// Example 5: Performance Monitoring Integration
// ============================================================================

export class PerformanceMonitoredRepository {
  
  async reorderChaptersWithMonitoring(courseId: string, chapterIds: string[], context: any): Promise<void> {
    console.log('\n=== Performance Monitoring Integration ===');
    
    const startTime = Date.now();
    const metrics = {
      itemCount: 0,
      changesCount: 0,
      renumberingTriggered: false,
      dbUpdateTime: 0,
      totalTime: 0
    };

    try {
      // Get data and measure
      const course = await this.getCourseData(courseId);
      metrics.itemCount = course.chapters.length;

      // Convert to orderable format
      const orderableChapters: OrderableItem[] = course.chapters.map(ch => ({
        id: ch.id.toString(),
        order: ch.order,
      }));

      // Find moved item
      const currentOrder = orderableChapters
        .sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER))
        .map(ch => ch.id);
      
      const moveData = this.findMovedItem(currentOrder, chapterIds);
      if (!moveData.movedId) return;

      // Apply reorder function
      const reorderStart = Date.now();
      const reorderResult = reorderItems(orderableChapters, moveData.movedId, moveData.newPosition);
      const reorderTime = Date.now() - reorderStart;

      // Update metrics
      metrics.changesCount = reorderResult.changes.length;
      metrics.renumberingTriggered = reorderResult.changes.length > 1;

      console.log('📊 Reorder Metrics:');
      console.log(`  Items processed: ${metrics.itemCount}`);
      console.log(`  Changes needed: ${metrics.changesCount}`);
      console.log(`  Renumbering triggered: ${metrics.renumberingTriggered ? 'Yes' : 'No'}`);
      console.log(`  Reorder calculation time: ${reorderTime}ms`);

      // Apply database updates with timing
      const dbStart = Date.now();
      for (const change of reorderResult.changes) {
        await this.updateChapterOrderWithMetrics(courseId, change.id, change.order);
      }
      metrics.dbUpdateTime = Date.now() - dbStart;

      metrics.totalTime = Date.now() - startTime;

      // Log performance metrics
      console.log('⚡ Performance Summary:');
      console.log(`  Database update time: ${metrics.dbUpdateTime}ms`);
      console.log(`  Total operation time: ${metrics.totalTime}ms`);
      console.log(`  Updates per second: ${(metrics.changesCount / (metrics.dbUpdateTime / 1000)).toFixed(2)}`);

      // Alert if performance is degraded
      if (metrics.totalTime > 1000) {
        console.warn('⚠️ Performance warning: Operation took longer than 1 second');
      }

    } catch (error) {
      metrics.totalTime = Date.now() - startTime;
      console.error('❌ Operation failed after', metrics.totalTime, 'ms:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async getCourseData(courseId: string) {
    return {
      chapters: [
        { id: new ObjectId(), order: 10 },
        { id: new ObjectId(), order: 20 },
        { id: new ObjectId(), order: 30 }
      ]
    };
  }

  private findMovedItem(currentOrder: string[], newOrder: string[]) {
    for (let i = 0; i < newOrder.length; i++) {
      if (currentOrder[i] !== newOrder[i]) {
        return { movedId: newOrder[i], newPosition: i };
      }
    }
    return { movedId: null, newPosition: -1 };
  }

  private async updateChapterOrderWithMetrics(courseId: string, chapterId: string, order: number) {
    // Simulate database update with timing
    const updateStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate DB latency
    const updateTime = Date.now() - updateStart;
    console.log(`    📝 Updated ${chapterId} in ${updateTime}ms`);
  }
}

// ============================================================================
// Example Usage
// ============================================================================

export async function runRepositoryIntegrationExamples() {
  console.log('🚀 Running Repository Integration Examples\n');

  // Example 1: Course repository
  const courseRepo = new ExampleCourseRepository();
  await courseRepo.reorderChapters('course123', ['chap2', 'chap1', 'chap3', 'chap4'], {});

  // Example 2: Lesson repository
  const lessonRepo = new ExampleLessonRepository();
  await lessonRepo.reorderLessons('course123', 'chapter123', ['lesson3', 'lesson1', 'lesson2'], {});

  // Example 3: SubLesson repository
  const subLessonRepo = new ExampleSubLessonRepository();
  await subLessonRepo.reorderSubLessons('lesson123', ['sub2', 'sub3', 'sub1'], {});

  // Example 4: Service layer
  const courseService = new ExampleCourseService(courseRepo, lessonRepo);
  const serviceResult = await courseService.reorderCourseContent(
    'course123',
    'chapters',
    ['chap1', 'chap2', 'chap3'],
    undefined,
    {}
  );
  console.log('\nService Result:', serviceResult);

  // Example 5: Performance monitoring
  const perfRepo = new PerformanceMonitoredRepository();
  await perfRepo.reorderChaptersWithMonitoring('course123', ['chap3', 'chap1', 'chap2'], {});

  console.log('\n✅ All repository integration examples completed!');
}

// Uncomment to run examples:
// runRepositoryIntegrationExamples();