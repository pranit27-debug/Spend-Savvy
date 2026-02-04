import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../lib/db';
import { cache, cacheKeys, cacheTTL, invalidateCache } from '../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type');
    const timeframe = url.searchParams.get('timeframe') || 'this_month';
    const category = url.searchParams.get('category');
    const subcategory = url.searchParams.get('subcategory');
    const friendId = url.searchParams.get('friendId');

    console.log('Analytics API GET called with:', { userId, type, timeframe, category, subcategory, friendId });

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Generate cache key for analytics
    const cacheKey = cacheKeys.analytics(
      userId, 
      type || 'total_spent', 
      timeframe, 
      category || undefined, 
      subcategory || undefined
    );
    
    // Try to get from cache first
    const cachedAnalytics = await cache.get(cacheKey);
    if (cachedAnalytics) {
      console.log('✅ [ANALYTICS GET] Cache hit for:', cacheKey);
      return NextResponse.json({
        success: true,
        data: cachedAnalytics,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    console.log('❌ [ANALYTICS GET] Cache miss for:', cacheKey);

    const db = await connectToPostgres();

    // Determine date range based on timeframe
    let dateCondition = '';
    let dateParams: string[] = [];
    const now = new Date();
    
    switch (timeframe) {
      case 'this_month':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateCondition = `AND e.created_at >= $2`;
        dateParams.push(thisMonthStart.toISOString());
        break;
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        dateCondition = `AND e.created_at >= $2 AND e.created_at <= $3`;
        dateParams.push(lastMonthStart.toISOString(), lastMonthEnd.toISOString());
        break;
      case 'this_year':
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        dateCondition = `AND e.created_at >= $2`;
        dateParams.push(thisYearStart.toISOString());
        break;
      case 'last_week':
        const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = `AND e.created_at >= $2`;
        dateParams.push(lastWeekStart.toISOString());
        break;
      case 'all_time':
      default:
        dateCondition = '';
        break;
    }

    let result;

    switch (type) {
      case 'total_spent':
        let totalQuery = `
          SELECT COALESCE(SUM(es.amount), 0) as total_spent
          FROM expense_splits es
          INNER JOIN expenses e ON es.expense_id = e.id
          WHERE es.user_id = $1 ${dateCondition}
        `;
        let queryParams = [userId, ...dateParams];
        
        if (category || subcategory) {
          const categoryParamIndex = queryParams.length + 1;
          let conditions = [];
          let params = [];
          
          if (category && subcategory) {
            // Both category and subcategory provided - exact match with case insensitive
            conditions.push(`(LOWER(TRIM(e.category)) = LOWER(TRIM($${categoryParamIndex})) AND LOWER(TRIM(COALESCE(e.subcategory, ''))) = LOWER(TRIM($${categoryParamIndex + 1})))`);
            params.push(category, subcategory);
          } else if (subcategory) {
            // Only subcategory provided - case insensitive match
            conditions.push(`LOWER(TRIM(COALESCE(e.subcategory, ''))) = LOWER(TRIM($${categoryParamIndex}))`);
            params.push(subcategory);
          } else if (category) {
            // Only category provided - case insensitive match
            conditions.push(`LOWER(TRIM(e.category)) = LOWER(TRIM($${categoryParamIndex}))`);
            params.push(category);
          }
          
          totalQuery += ` AND ${conditions[0]}`;
          queryParams.push(...params);
        }
        
        console.log('Total spent query:', totalQuery);
        console.log('Query params:', queryParams);
        
        const totalResult = await db.query(totalQuery, queryParams);
        console.log('Total spent result:', totalResult.rows);
        
        // If no results and category/subcategory was specified, show available categories and subcategories
        if (totalResult.rows[0]?.total_spent === '0' && (category || subcategory)) {
          const categoriesQuery = `
            SELECT DISTINCT e.category, e.subcategory, e.created_at, es.amount
            FROM expenses e 
            INNER JOIN expense_splits es ON e.id = es.expense_id 
            WHERE es.user_id = $1
            ORDER BY e.created_at DESC
            LIMIT 20
          `;
          const categoriesResult = await db.query(categoriesQuery, [userId]);
          console.log('Recent expenses with categories and subcategories for user:', 
            categoriesResult.rows.map(r => ({ 
              category: r.category, 
              subcategory: r.subcategory, 
              created_at: r.created_at,
              amount: r.amount
            })));

          // Also check for coffee specifically
          const coffeeQuery = `
            SELECT e.id, e.description, e.category, e.subcategory, e.created_at, es.amount
            FROM expenses e 
            INNER JOIN expense_splits es ON e.id = es.expense_id 
            WHERE es.user_id = $1 AND LOWER(TRIM(COALESCE(e.subcategory, ''))) = 'coffee'
            ORDER BY e.created_at DESC
          `;
          const coffeeResult = await db.query(coffeeQuery, [userId]);
          console.log('Coffee expenses found:', 
            coffeeResult.rows.map(r => ({ 
              id: r.id,
              description: r.description,
              category: r.category, 
              subcategory: r.subcategory, 
              created_at: r.created_at,
              amount: r.amount
            })));
        }
        
        result = {
          total_spent: parseFloat(totalResult.rows[0]?.total_spent || '0'),
          timeframe,
          category
        };
        break;

      case 'category_breakdown':
        const categoryQuery = `
          SELECT 
            e.category,
            e.subcategory,
            COALESCE(SUM(es.amount), 0) as amount,
            COUNT(*) as count
          FROM expense_splits es
          INNER JOIN expenses e ON es.expense_id = e.id
          WHERE es.user_id = $1 ${dateCondition}
          GROUP BY e.category, e.subcategory
          ORDER BY amount DESC
        `;
        const categoryResult = await db.query(categoryQuery, [userId, ...dateParams]);
        result = {
          categories: categoryResult.rows.map(row => ({
            category: row.category,
            subcategory: row.subcategory,
            amount: parseFloat(row.amount),
            count: parseInt(row.count)
          })),
          timeframe
        };
        break;

      case 'friend_expenses':
        let friendQuery = `
          SELECT 
            u.name as friend_name,
            u.id as friend_id,
            COALESCE(SUM(es2.amount), 0) as total_amount,
            COUNT(DISTINCT e.id) as expense_count
          FROM expenses e
          INNER JOIN expense_splits es1 ON e.id = es1.expense_id AND es1.user_id = $1
          INNER JOIN expense_splits es2 ON e.id = es2.expense_id AND es2.user_id != $1
          INNER JOIN users u ON es2.user_id = u.id
          WHERE 1=1 ${dateCondition}
        `;
        let friendQueryParams = [userId, ...dateParams];
        
        if (friendId) {
          const friendParamIndex = friendQueryParams.length + 1;
          friendQuery += ` AND u.id = $${friendParamIndex}`;
          friendQueryParams.push(friendId);
        }
        
        friendQuery += ` GROUP BY u.id, u.name ORDER BY total_amount DESC`;
        
        const friendResult = await db.query(friendQuery, friendQueryParams);
        result = {
          friend_expenses: friendResult.rows.map(row => ({
            friend_name: row.friend_name,
            friend_id: row.friend_id,
            total_amount: parseFloat(row.total_amount),
            expense_count: parseInt(row.expense_count)
          })),
          timeframe
        };
        break;

      case 'monthly_comparison':
        const comparisonQuery = `
          SELECT 
            DATE_TRUNC('month', e.created_at) as month,
            COALESCE(SUM(es.amount), 0) as amount
          FROM expense_splits es
          INNER JOIN expenses e ON es.expense_id = e.id
          WHERE es.user_id = $1 
          AND e.created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', e.created_at)
          ORDER BY month DESC
          LIMIT 12
        `;
        const comparisonResult = await db.query(comparisonQuery, [userId]);
        result = {
          monthly_data: comparisonResult.rows.map(row => ({
            month: row.month,
            amount: parseFloat(row.amount)
          }))
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    // Cache the analytics result with enhanced logging
    await cache.set(cacheKey, result, cacheTTL.MEDIUM);
    console.log('✅ [ANALYTICS GET] Cached result for:', cacheKey);

    return NextResponse.json({
      success: true,
      type,
      timeframe,
      data: result,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ANALYTICS GET] Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST method for creating custom analytics reports and AI insights
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reportType, filters, preferences, generateAI } = body;

    console.log('📊 [ANALYTICS POST] Creating custom analytics:', { userId, reportType, filters, generateAI });

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Generate cache key for custom report
    const customCacheKey = `custom_analytics:${userId}:${reportType}:${JSON.stringify(filters)}`;
    
    // Check cache for custom report
    const cachedCustomReport = await cache.get(customCacheKey);
    if (cachedCustomReport && !generateAI) {
      console.log('✅ [ANALYTICS POST] Cache hit for custom report:', customCacheKey);
      return NextResponse.json({
        success: true,
        data: cachedCustomReport,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const db = await connectToPostgres();
    let customData = {};

    switch (reportType) {
      case 'spending_insights':
        customData = await generateSpendingInsights(db, userId, filters);
        break;
      case 'friend_analysis':
        customData = await generateFriendAnalysis(db, userId, filters);
        break;
      case 'category_deep_dive':
        customData = await generateCategoryDeepDive(db, userId, filters);
        break;
      case 'temporal_analysis':
        customData = await generateTemporalAnalysis(db, userId, filters);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Generate AI insights if requested
    if (generateAI) {
      const aiInsights = await generateAIInsights(customData, userId, reportType);
      customData = { ...customData, aiInsights };
    }

    // Cache the custom report
    await cache.set(customCacheKey, customData, cacheTTL.MEDIUM);
    console.log('✅ [ANALYTICS POST] Cached custom report:', customCacheKey);

    // Save preferences if provided
    if (preferences) {
      const prefCacheKey = `analytics_prefs:${userId}`;
      await cache.set(prefCacheKey, preferences, cacheTTL.VERY_LONG);
      console.log('✅ [ANALYTICS POST] Cached user preferences:', prefCacheKey);
    }

    return NextResponse.json({
      success: true,
      reportType,
      data: customData,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ANALYTICS POST] Error creating custom analytics:', error);
    return NextResponse.json(
      { error: 'Failed to create custom analytics report' },
      { status: 500 }
    );
  }
}

// Helper function to generate spending insights
async function generateSpendingInsights(db: any, userId: string, filters: any) {
  const { timeframe = 'this_month', includeCategories = true, includeTrends = true } = filters;
  
  // Build date condition
  let dateCondition = '';
  let dateParams: string[] = [];
  const now = new Date();
  
  switch (timeframe) {
    case 'this_month':
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(thisMonthStart.toISOString());
      break;
    case 'last_3_months':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(threeMonthsAgo.toISOString());
      break;
    case 'this_year':
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(thisYearStart.toISOString());
      break;
  }

  const insights: any = { timeframe };

  // Get spending patterns
  const spendingPatternsQuery = `
    SELECT 
      DATE_TRUNC('week', e.created_at) as week,
      COUNT(*) as expense_count,
      SUM(es.amount) as total_amount,
      AVG(es.amount) as avg_amount
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = $1 ${dateCondition}
    GROUP BY DATE_TRUNC('week', e.created_at)
    ORDER BY week DESC
    LIMIT 12
  `;
  
  const patternsResult = await db.query(spendingPatternsQuery, [userId, ...dateParams]);
  insights.weeklyPatterns = patternsResult.rows.map((row: any) => ({
    week: row.week,
    expenseCount: parseInt(row.expense_count),
    totalAmount: parseFloat(row.total_amount),
    avgAmount: parseFloat(row.avg_amount)
  }));

  // Get top spending days
  const topDaysQuery = `
    SELECT 
      EXTRACT(DOW FROM e.created_at) as day_of_week,
      COUNT(*) as expense_count,
      SUM(es.amount) as total_amount
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    WHERE es.user_id = $1 ${dateCondition}
    GROUP BY EXTRACT(DOW FROM e.created_at)
    ORDER BY total_amount DESC
  `;
  
  const daysResult = await db.query(topDaysQuery, [userId, ...dateParams]);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  insights.topSpendingDays = daysResult.rows.map((row: any) => ({
    dayOfWeek: dayNames[row.day_of_week],
    expenseCount: parseInt(row.expense_count),
    totalAmount: parseFloat(row.total_amount)
  }));

  if (includeCategories) {
    const categoryTrendsQuery = `
      SELECT 
        e.category,
        e.subcategory,
        COUNT(*) as frequency,
        SUM(es.amount) as total_amount,
        AVG(es.amount) as avg_amount,
        MAX(es.amount) as max_amount,
        MIN(es.amount) as min_amount
      FROM expense_splits es
      INNER JOIN expenses e ON es.expense_id = e.id
      WHERE es.user_id = $1 ${dateCondition}
      GROUP BY e.category, e.subcategory
      ORDER BY total_amount DESC
    `;
    
    const categoryResult = await db.query(categoryTrendsQuery, [userId, ...dateParams]);
    insights.categoryInsights = categoryResult.rows.map((row: any) => ({
      category: row.category,
      subcategory: row.subcategory,
      frequency: parseInt(row.frequency),
      totalAmount: parseFloat(row.total_amount),
      avgAmount: parseFloat(row.avg_amount),
      maxAmount: parseFloat(row.max_amount),
      minAmount: parseFloat(row.min_amount)
    }));
  }

  return insights;
}

// Helper function to generate friend analysis
async function generateFriendAnalysis(db: any, userId: string, filters: any) {
  const { timeframe = 'this_month', includeMutualFriends = true } = filters;
  
  let dateCondition = '';
  let dateParams: string[] = [];
  const now = new Date();
  
  switch (timeframe) {
    case 'this_month':
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(thisMonthStart.toISOString());
      break;
    case 'last_3_months':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(threeMonthsAgo.toISOString());
      break;
  }

  // Get detailed friend expense analysis
  const friendAnalysisQuery = `
    SELECT 
      u.id as friend_id,
      u.name as friend_name,
      COUNT(DISTINCT e.id) as shared_expenses,
      SUM(es2.amount) as friend_total_spent,
      SUM(es1.amount) as user_total_spent,
      AVG(es2.amount) as friend_avg_expense,
      AVG(es1.amount) as user_avg_expense,
      MAX(e.created_at) as last_expense_date,
      COUNT(DISTINCT e.category) as categories_shared
    FROM expenses e
    INNER JOIN expense_splits es1 ON e.id = es1.expense_id AND es1.user_id = $1
    INNER JOIN expense_splits es2 ON e.id = es2.expense_id AND es2.user_id != $1
    INNER JOIN users u ON es2.user_id = u.id
    WHERE 1=1 ${dateCondition}
    GROUP BY u.id, u.name
    ORDER BY shared_expenses DESC, friend_total_spent DESC
  `;
  
  const friendResult = await db.query(friendAnalysisQuery, [userId, ...dateParams]);
  
  const analysis = {
    timeframe,
    friendAnalysis: friendResult.rows.map((row: any) => ({
      friendId: row.friend_id,
      friendName: row.friend_name,
      sharedExpenses: parseInt(row.shared_expenses),
      friendTotalSpent: parseFloat(row.friend_total_spent),
      userTotalSpent: parseFloat(row.user_total_spent),
      friendAvgExpense: parseFloat(row.friend_avg_expense),
      userAvgExpense: parseFloat(row.user_avg_expense),
      lastExpenseDate: row.last_expense_date,
      categoriesShared: parseInt(row.categories_shared),
      spendingRatio: parseFloat(row.friend_total_spent) / parseFloat(row.user_total_spent)
    }))
  };

  return analysis;
}

// Helper function to generate category deep dive
async function generateCategoryDeepDive(db: any, userId: string, filters: any) {
  const { category, timeframe = 'this_month' } = filters;
  
  if (!category) {
    throw new Error('Category is required for deep dive analysis');
  }

  let dateCondition = '';
  let dateParams: string[] = [];
  const now = new Date();
  
  switch (timeframe) {
    case 'this_month':
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateCondition = `AND e.created_at >= $3`;
      dateParams.push(thisMonthStart.toISOString());
      break;
    case 'last_3_months':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      dateCondition = `AND e.created_at >= $3`;
      dateParams.push(threeMonthsAgo.toISOString());
      break;
  }

  // Get detailed category analysis
  const categoryDeepDiveQuery = `
    SELECT 
      e.subcategory,
      e.description,
      es.amount,
      e.created_at,
      u.name as shared_with
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    LEFT JOIN expense_splits es2 ON e.id = es2.expense_id AND es2.user_id != es.user_id
    LEFT JOIN users u ON es2.user_id = u.id
    WHERE es.user_id = $1 
    AND LOWER(TRIM(e.category)) = LOWER(TRIM($2))
    ${dateCondition}
    ORDER BY e.created_at DESC
  `;
  
  const deepDiveResult = await db.query(categoryDeepDiveQuery, [userId, category, ...dateParams]);
  
  const analysis = {
    category,
    timeframe,
    expenses: deepDiveResult.rows.map((row: any) => ({
      subcategory: row.subcategory,
      description: row.description,
      amount: parseFloat(row.amount),
      date: row.created_at,
      sharedWith: row.shared_with
    })),
    summary: {
      totalExpenses: deepDiveResult.rows.length,
      totalAmount: deepDiveResult.rows.reduce((sum: number, row: any) => sum + parseFloat(row.amount), 0),
      avgAmount: deepDiveResult.rows.length > 0 ? 
        deepDiveResult.rows.reduce((sum: number, row: any) => sum + parseFloat(row.amount), 0) / deepDiveResult.rows.length : 0,
      subcategories: [...new Set(deepDiveResult.rows.map((row: any) => row.subcategory).filter(Boolean))]
    }
  };

  return analysis;
}

// Helper function to generate temporal analysis
async function generateTemporalAnalysis(db: any, userId: string, filters: any) {
  const { granularity = 'monthly', timeframe = 'this_year' } = filters;
  
  let dateCondition = '';
  let dateParams: string[] = [];
  let truncateBy = 'month';
  
  const now = new Date();
  
  switch (timeframe) {
    case 'this_year':
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(thisYearStart.toISOString());
      break;
    case 'last_12_months':
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      dateCondition = `AND e.created_at >= $2`;
      dateParams.push(twelveMonthsAgo.toISOString());
      break;
  }

  if (granularity === 'weekly') {
    truncateBy = 'week';
  } else if (granularity === 'daily') {
    truncateBy = 'day';
  }

  const temporalQuery = `
    SELECT 
      DATE_TRUNC('${truncateBy}', e.created_at) as time_period,
      COUNT(*) as expense_count,
      SUM(es.amount) as total_amount,
      AVG(es.amount) as avg_amount,
      COUNT(DISTINCT e.category) as unique_categories,
      COUNT(DISTINCT es2.user_id) as unique_friends
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    LEFT JOIN expense_splits es2 ON e.id = es2.expense_id AND es2.user_id != es.user_id
    WHERE es.user_id = $1 ${dateCondition}
    GROUP BY DATE_TRUNC('${truncateBy}', e.created_at)
    ORDER BY time_period DESC
  `;
  
  const temporalResult = await db.query(temporalQuery, [userId, ...dateParams]);
  
  const analysis = {
    granularity,
    timeframe,
    timeSeries: temporalResult.rows.map((row: any) => ({
      timePeriod: row.time_period,
      expenseCount: parseInt(row.expense_count),
      totalAmount: parseFloat(row.total_amount),
      avgAmount: parseFloat(row.avg_amount),
      uniqueCategories: parseInt(row.unique_categories),
      uniqueFriends: parseInt(row.unique_friends)
    }))
  };

  return analysis;
}

// Helper function to generate AI insights (placeholder - integrate with your AI service)
async function generateAIInsights(data: any, userId: string, reportType: string) {
  // This would integrate with your AI service (OpenAI, Gemini, etc.)
  // For now, return a simple analysis based on the data
  
  const insights = [];
  
  switch (reportType) {
    case 'spending_insights':
      if (data.weeklyPatterns && data.weeklyPatterns.length > 0) {
        const avgWeeklySpend = data.weeklyPatterns.reduce((sum: number, week: any) => sum + week.totalAmount, 0) / data.weeklyPatterns.length;
        insights.push({
          type: 'spending_pattern',
          message: `Your average weekly spending is ₹${avgWeeklySpend.toFixed(0)}. ${
            data.weeklyPatterns[0].totalAmount > avgWeeklySpend * 1.2 ? 
            'This week you\'re spending above average - consider reviewing your expenses.' :
            'Your spending is within normal patterns.'
          }`
        });
      }
      
      if (data.topSpendingDays && data.topSpendingDays.length > 0) {
        const topDay = data.topSpendingDays[0];
        insights.push({
          type: 'spending_day',
          message: `${topDay.dayOfWeek} is your highest spending day with ₹${topDay.totalAmount.toFixed(0)} total. Consider planning budget accordingly.`
        });
      }
      break;
      
    case 'friend_analysis':
      if (data.friendAnalysis && data.friendAnalysis.length > 0) {
        const topFriend = data.friendAnalysis[0];
        insights.push({
          type: 'friend_spending',
          message: `You share most expenses with ${topFriend.friendName} (${topFriend.sharedExpenses} expenses, ₹${topFriend.friendTotalSpent.toFixed(0)} total).`
        });
        
        const unbalancedFriends = data.friendAnalysis.filter((f: any) => f.spendingRatio > 2 || f.spendingRatio < 0.5);
        if (unbalancedFriends.length > 0) {
          insights.push({
            type: 'spending_balance',
            message: `You have unbalanced spending with ${unbalancedFriends.length} friends. Consider reviewing who pays for what.`
          });
        }
      }
      break;
  }
  
  return insights;
}

// PUT method for updating analytics preferences and cache management
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, preferences, clearCache } = body;

    console.log('⚙️ [ANALYTICS PUT] Updating analytics settings:', { userId, action, clearCache });

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let result: any = { success: true };

    switch (action) {
      case 'update_preferences':
        if (preferences) {
          const prefCacheKey = cacheKeys.analyticsPreferences(userId);
          await cache.set(prefCacheKey, preferences, cacheTTL.VERY_LONG);
          console.log('✅ [ANALYTICS PUT] Updated preferences:', prefCacheKey);
          result.preferences = preferences;
        }
        break;

      case 'clear_cache':
        await invalidateCache.analytics(userId);
        if (clearCache?.includeCustom) {
          await invalidateCache.customAnalytics(userId);
        }
        if (clearCache?.includeAI) {
          await invalidateCache.aiInsights(userId);
        }
        console.log('✅ [ANALYTICS PUT] Cache cleared for user:', userId);
        result.cacheCleared = true;
        break;

      case 'refresh_cache':
        // Clear existing cache and trigger fresh data fetch
        await invalidateCache.analytics(userId);
        
        // Pre-populate cache with fresh data
        const db = await connectToPostgres();
        const freshDataPromises = [
          generateCachedAnalytics(db, userId, 'total_spent', 'this_month'),
          generateCachedAnalytics(db, userId, 'category_breakdown', 'this_month'),
          generateCachedAnalytics(db, userId, 'friend_expenses', 'this_month')
        ];
        
        await Promise.all(freshDataPromises);
        console.log('✅ [ANALYTICS PUT] Cache refreshed for user:', userId);
        result.cacheRefreshed = true;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ANALYTICS PUT] Error updating analytics settings:', error);
    return NextResponse.json(
      { error: 'Failed to update analytics settings' },
      { status: 500 }
    );
  }
}

// Helper function to generate and cache analytics data
async function generateCachedAnalytics(db: any, userId: string, type: string, timeframe: string) {
  const cacheKey = cacheKeys.analytics(userId, type, timeframe);
  
  try {
    // Generate fresh data based on type
    let result;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (type) {
      case 'total_spent':
        const totalQuery = `
          SELECT COALESCE(SUM(es.amount), 0) as total_spent
          FROM expense_splits es
          INNER JOIN expenses e ON es.expense_id = e.id
          WHERE es.user_id = $1 AND e.created_at >= $2
        `;
        const totalResult = await db.query(totalQuery, [userId, thisMonthStart.toISOString()]);
        result = {
          total_spent: parseFloat(totalResult.rows[0]?.total_spent || '0'),
          timeframe,
          category: null
        };
        break;

      case 'category_breakdown':
        const categoryQuery = `
          SELECT 
            e.category,
            e.subcategory,
            COALESCE(SUM(es.amount), 0) as amount,
            COUNT(*) as count
          FROM expense_splits es
          INNER JOIN expenses e ON es.expense_id = e.id
          WHERE es.user_id = $1 AND e.created_at >= $2
          GROUP BY e.category, e.subcategory
          ORDER BY amount DESC
        `;
        const categoryResult = await db.query(categoryQuery, [userId, thisMonthStart.toISOString()]);
        result = {
          categories: categoryResult.rows.map((row: any) => ({
            category: row.category,
            subcategory: row.subcategory,
            amount: parseFloat(row.amount),
            count: parseInt(row.count)
          })),
          timeframe
        };
        break;

      case 'friend_expenses':
        const friendQuery = `
          SELECT 
            u.name as friend_name,
            u.id as friend_id,
            COALESCE(SUM(es2.amount), 0) as total_amount,
            COUNT(DISTINCT e.id) as expense_count
          FROM expenses e
          INNER JOIN expense_splits es1 ON e.id = es1.expense_id AND es1.user_id = $1
          INNER JOIN expense_splits es2 ON e.id = es2.expense_id AND es2.user_id != $1
          INNER JOIN users u ON es2.user_id = u.id
          WHERE e.created_at >= $2
          GROUP BY u.id, u.name ORDER BY total_amount DESC
        `;
        const friendResult = await db.query(friendQuery, [userId, thisMonthStart.toISOString()]);
        result = {
          friend_expenses: friendResult.rows.map((row: any) => ({
            friend_name: row.friend_name,
            friend_id: row.friend_id,
            total_amount: parseFloat(row.total_amount),
            expense_count: parseInt(row.expense_count)
          })),
          timeframe
        };
        break;
    }

    // Cache the result
    if (result) {
      await cache.set(cacheKey, result, cacheTTL.MEDIUM);
      console.log('✅ [CACHE REFRESH] Generated and cached:', cacheKey);
    }

    return result;
  } catch (error) {
    console.error('❌ [CACHE REFRESH] Error generating cached analytics:', error);
    return null;
  }
}
