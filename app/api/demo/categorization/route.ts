import { NextRequest, NextResponse } from 'next/server';
import { categorizeExpenseWithEmbeddings } from '../../../../lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const { expenses } = await request.json();
    
    if (!expenses || !Array.isArray(expenses)) {
      return NextResponse.json(
        { error: 'Please provide an array of expense descriptions' },
        { status: 400 }
      );
    }

    console.log(`\n🚀 [DEMO] ============================================`);
    console.log(`📊 [DEMO] BATCH CATEGORIZATION TEST STARTED`);
    console.log(`📝 [DEMO] Processing ${expenses.length} expenses`);
    console.log(`🆚 [DEMO] COMPARING: Embeddings vs Traditional Gemini AI`);
    console.log(`💰 [DEMO] Cost Analysis: Embeddings vs $${(expenses.length * 0.02).toFixed(2)} Gemini`);
    console.log(`⏱️ [DEMO] Speed Test: Local Processing vs AI Calls`);
    console.log(`🚀 [DEMO] ============================================\n`);
    
    const results = [];
    const timings = [];
    let totalEmbeddingTime = 0;
    let totalAIFallbacks = 0;
    let cacheHits = 0;
    
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      const startTime = Date.now();
      
      console.log(`\n📋 [DEMO ${i+1}/${expenses.length}] Processing: "${expense}"`);
      
      try {
        const result = await categorizeExpenseWithEmbeddings(expense);
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ [DEMO ${i+1}] Success: ${result.category} (${result.method}) - ${processingTime}ms`);
        
        results.push({
          expense,
          category: result.category,
          subcategory: result.subcategory,
          confidence: result.confidence,
          method: result.method,
          processingTime: `${processingTime}ms`
        });
        
        timings.push(processingTime);
        totalEmbeddingTime += processingTime;
        
        if (result.method === 'ai') {
          totalAIFallbacks++;
          console.log(`💸 [DEMO ${i+1}] COST ALERT: Used expensive Gemini API!`);
        }
        
        if (result.method === 'exact' || result.method === 'similar') {
          cacheHits++;
          console.log(`🚀 [DEMO ${i+1}] SPEED WIN: Local processing saved time!`);
        }
        
      } catch (error) {
        console.error(`❌ [DEMO ${i+1}] Failed to categorize "${expense}":`, error);
        results.push({
          expense,
          category: 'other',
          subcategory: 'error',
          confidence: 0,
          method: 'error',
          processingTime: `${Date.now() - startTime}ms`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`\n📊 [DEMO RESULTS] ============================================`);
    console.log(`✅ [DEMO RESULTS] BATCH PROCESSING COMPLETE!`);
    console.log(`📈 [DEMO RESULTS] Embeddings Success: ${expenses.length - totalAIFallbacks}/${expenses.length} (${((expenses.length - totalAIFallbacks)/expenses.length*100).toFixed(1)}%)`);
    console.log(`🤖 [DEMO RESULTS] AI Fallbacks: ${totalAIFallbacks}/${expenses.length} (${(totalAIFallbacks/expenses.length*100).toFixed(1)}%)`);
    console.log(`⚡ [DEMO RESULTS] Fast Local Processing: ${cacheHits}/${expenses.length} (${(cacheHits/expenses.length*100).toFixed(1)}%)`);
    
    // Calculate cost savings
    const avgEmbeddingTime = totalEmbeddingTime / expenses.length;
    const estimatedAITime = expenses.length * 2000; // Estimate 2s per AI call
    const timeSaved = estimatedAITime - totalEmbeddingTime;
    
    // Cost calculation (rough estimates)
    const embeddingCost = expenses.length * 0.0001; // $0.0001 per embedding
    const aiCost = expenses.length * 0.02; // $0.02 per AI categorization
    const actualCost = (expenses.length - totalAIFallbacks) * 0.0001 + totalAIFallbacks * 0.02;
    const costSavings = aiCost - actualCost;
    const costSavingsPercentage = ((costSavings / aiCost) * 100).toFixed(1);
    
    console.log(`💰 [DEMO RESULTS] Traditional AI Cost: $${aiCost.toFixed(4)}`);
    console.log(`💰 [DEMO RESULTS] Actual Hybrid Cost: $${actualCost.toFixed(4)}`);
    console.log(`💰 [DEMO RESULTS] Money Saved: $${costSavings.toFixed(4)} (${costSavingsPercentage}%)`);
    console.log(`⏱️ [DEMO RESULTS] Time Saved: ${timeSaved}ms (${(timeSaved/1000).toFixed(1)}s)`);
    console.log(`📊 [DEMO RESULTS] ============================================\n`);
    
    const summary = {
      totalExpenses: expenses.length,
      averageProcessingTime: `${Math.round(avgEmbeddingTime)}ms`,
      totalProcessingTime: `${totalEmbeddingTime}ms`,
      estimatedAITime: `${estimatedAITime}ms`,
      timeSaved: `${timeSaved}ms`,
      localProcessingHits: cacheHits,
      aiFallbacks: totalAIFallbacks,
      embeddingSuccess: expenses.length - totalAIFallbacks,
      successRate: `${((expenses.length - totalAIFallbacks)/expenses.length*100).toFixed(1)}%`,
      costAnalysis: {
        traditionalAICost: `$${aiCost.toFixed(4)}`,
        actualHybridCost: `$${actualCost.toFixed(4)}`,
        costSavings: `$${costSavings.toFixed(4)}`,
        savingsPercentage: `${costSavingsPercentage}%`
      }
    };
    
    console.log(`📊 [DEMO] Processing complete:`, summary);
    
    return NextResponse.json({
      success: true,
      results,
      summary,
      message: `Successfully categorized ${expenses.length} expenses with ${costSavingsPercentage}% cost savings!`
    });
    
  } catch (error) {
    console.error('❌ [DEMO] Error in batch categorization:', error);
    return NextResponse.json(
      { 
        error: 'Batch categorization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return sample expenses for testing
  const sampleExpenses = [
    "Starbucks Coffee Downtown",
    "McDonald's Drive Thru",
    "Shell Gas Station",
    "Walmart Grocery Store",
    "Netflix Subscription",
    "Uber Ride to Airport",
    "AMC Movie Theater",
    "Target Department Store",
    "Pizza Hut Delivery",
    "CVS Pharmacy",
    "Home Depot Hardware",
    "Amazon Online Purchase",
    "Chipotle Mexican Grill",
    "LA Fitness Gym",
    "Spotify Premium",
    "Apple Store",
    "Best Buy Electronics",
    "Whole Foods Market",
    "Costco Wholesale",
    "7-Eleven Convenience Store"
  ];
  
  return NextResponse.json({
    sampleExpenses,
    message: "Use POST with { expenses: [...] } to test batch categorization",
    endpoint: "/api/demo/categorization"
  });
}
