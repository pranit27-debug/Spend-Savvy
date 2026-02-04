import { NextRequest, NextResponse } from 'next/server';
import { categorizeExpenseWithEmbeddings } from '../../../../lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();
    
    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    console.log(`\n🔬 [TECHNIQUE DEMO] ============================================`);
    console.log(`📝 [TECHNIQUE DEMO] Input: "${description}"`);
    console.log(`🎯 [TECHNIQUE DEMO] LIVE DEMONSTRATION: Which technique will win?`);
    console.log(`🔬 [TECHNIQUE DEMO] ============================================\n`);
    
    const startTime = Date.now();
    const result = await categorizeExpenseWithEmbeddings(description);
    const totalTime = Date.now() - startTime;
    
    // Create detailed breakdown
    const techniqueAnalysis = {
      input: description,
      result: {
        category: result.category,
        subcategory: result.subcategory,
        confidence: `${(result.confidence * 100).toFixed(1)}%`,
        method: result.method
      },
      performance: {
        processingTime: `${totalTime}ms`,
        technique: getTechniqueName(result.method),
        costEstimate: getCostEstimate(result.method),
        speedRating: getSpeedRating(result.method)
      },
      comparison: {
        vsTraditionalAI: {
          speedImprovement: result.method === 'ai' ? '0x' : `${Math.round(2000/totalTime)}x faster`,
          costSavings: result.method === 'ai' ? '$0.00' : '$0.02 saved',
          accuracy: result.method === 'ai' ? 'High (AI)' : `${getAccuracyLevel(result.confidence)} (Local)`
        }
      },
      explanation: getMethodExplanation(result.method, result.confidence)
    };
    
    console.log(`\n📊 [TECHNIQUE RESULT] ============================================`);
    console.log(`🏆 [TECHNIQUE RESULT] WINNER: ${techniqueAnalysis.performance.technique}`);
    console.log(`📋 [TECHNIQUE RESULT] Category: ${result.category}/${result.subcategory}`);
    console.log(`⚡ [TECHNIQUE RESULT] Speed: ${techniqueAnalysis.performance.speedRating}`);
    console.log(`💰 [TECHNIQUE RESULT] Cost: ${techniqueAnalysis.performance.costEstimate}`);
    console.log(`📊 [TECHNIQUE RESULT] ============================================\n`);
    
    return NextResponse.json({
      success: true,
      analysis: techniqueAnalysis,
      message: `Categorized using ${techniqueAnalysis.performance.technique} in ${totalTime}ms`
    });
    
  } catch (error) {
    console.error('❌ [TECHNIQUE DEMO] Error:', error);
    return NextResponse.json(
      { 
        error: 'Technique demonstration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getTechniqueName(method: string): string {
  const techniques: Record<string, string> = {
    'exact': '🎯 EXACT MATCH (Database Lookup)',
    'similar': '🔍 SIMILARITY MATCHING (Pattern Recognition)',
    'keyword': '🔤 KEYWORD ANALYSIS (Text Processing)',
    'ai': '🤖 GEMINI AI (Machine Learning)',
    'fallback': '📋 RULE-BASED FALLBACK (Default Logic)'
  };
  return techniques[method] || '❓ Unknown Technique';
}

function getCostEstimate(method: string): string {
  const costs: Record<string, string> = {
    'exact': '$0.00 (Free)',
    'similar': '$0.00 (Free)',
    'keyword': '$0.00 (Free)',
    'ai': '$0.02 (Paid API)',
    'fallback': '$0.00 (Free)'
  };
  return costs[method] || '$0.00';
}

function getSpeedRating(method: string): string {
  const speeds: Record<string, string> = {
    'exact': '⚡ INSTANT (~1ms)',
    'similar': '🚀 VERY FAST (~5ms)',
    'keyword': '💨 FAST (~10ms)',
    'ai': '🐌 SLOW (~2000ms)',
    'fallback': '⚡ INSTANT (~1ms)'
  };
  return speeds[method] || '❓ Unknown';
}

function getAccuracyLevel(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

function getMethodExplanation(method: string, confidence: number): string {
  const explanations: Record<string, string> = {
    'exact': `Found perfect match in local database. This merchant was seen before and categorized with 100% accuracy. No API calls needed!`,
    'similar': `Detected similar pattern to known merchants. Used local pattern matching algorithms to categorize with ${(confidence*100).toFixed(1)}% confidence.`,
    'keyword': `Analyzed keywords in the description using local text processing. Matched category-specific terms with ${(confidence*100).toFixed(1)}% confidence.`,
    'ai': `All local methods failed to achieve high confidence. Fell back to expensive Gemini AI for accurate categorization. This cost $0.02.`,
    'fallback': `No specific patterns detected. Used basic rule-based logic to assign default category with ${(confidence*100).toFixed(1)}% confidence.`
  };
  return explanations[method] || 'Unknown categorization method used.';
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/demo/technique",
    description: "Live demonstration of categorization techniques",
    usage: "POST { description: 'merchant name or expense description' }",
    examples: [
      "Starbucks Coffee",
      "Unknown Local Restaurant",
      "XYZ-123 Weird Merchant",
      "Gas station purchase",
      "Some random expense"
    ],
    techniques: [
      "🎯 Exact Match (fastest, free, perfect accuracy)",
      "🔍 Similarity (very fast, free, high accuracy)", 
      "🔤 Keyword Analysis (fast, free, medium accuracy)",
      "🤖 Gemini AI (slow, costly, high accuracy)",
      "📋 Rule Fallback (instant, free, low accuracy)"
    ]
  });
}
