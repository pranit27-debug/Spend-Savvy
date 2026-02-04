import { NextRequest, NextResponse } from 'next/server';
import { geminiAssistant } from '../../../../lib/gemini';
import { connectToPostgres } from '../../../../lib/db';
import { cache, cacheKeys, cacheTTL } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, conversationHistory, pendingConfirmation } = await request.json();

    console.log('Enhanced chat API called with:', { 
      message, 
      userId, 
      historyLength: conversationHistory?.length || 0,
      hasPendingConfirmation: !!pendingConfirmation 
    });

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        message: "AI service is not configured. Please check the Gemini API key."
      });
    }

    const db = await connectToPostgres();

    // Check cache for user info and friends (for common queries)
    const userCacheKey = cacheKeys.user(userId);
    const friendsCacheKey = cacheKeys.friends(userId);
    
    console.log(`🔍 [CHAT] Checking cache for user and friends data...`);
    
    let currentUser = await cache.get(userCacheKey);
    let friends = await cache.get(friendsCacheKey);
    
    if (!currentUser) {
      console.log(`❌ [CHAT] User cache miss, fetching from database...`);
      // Get user info
      const userResult = await db.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      currentUser = userResult.rows[0];
      
      // Cache user info
      console.log(`💾 [CHAT] Caching user info...`);
      await cache.set(userCacheKey, currentUser, cacheTTL.LONG);
      console.log(`✅ [CHAT] User info cached successfully`);
    } else {
      console.log(`✅ [CHAT] User cache hit!`);
    }

    if (!friends) {
      console.log(`❌ [CHAT] Friends cache miss, fetching from database...`);
      // Get all user's friends
      const friendsResult = await db.query(
        `SELECT u.id, u.name, u.email 
         FROM users u 
         INNER JOIN friends f ON u.id = f.friend_id 
         WHERE f.user_id = $1`,
        [userId]
      );
      friends = friendsResult.rows;
      
      // Cache friends data
      console.log(`💾 [CHAT] Caching friends data...`);
      await cache.set(friendsCacheKey, friends, cacheTTL.LONG);
      console.log(`✅ [CHAT] Friends data cached successfully - ${friends.length} friends`);
    } else {
      console.log(`✅ [CHAT] Friends cache hit! ${friends.length} friends loaded from cache`);
    }

    // If friends is an object with a 'friends' property, extract the array
    let friendsArray = Array.isArray(friends) ? friends : (friends?.friends || []);

    // Use Gemini to process the user message
    const result = await geminiAssistant.processUserMessage(message, {
      userId: currentUser.id,
      userName: currentUser.name,
      friends: friendsArray,
      conversationHistory: conversationHistory || [],
      pendingConfirmation: pendingConfirmation
    });

    console.log('Gemini result:', result);

    // Normalize the result type to lowercase
    const normalizedType = result.type.toLowerCase();

    // Handle different types of queries
    switch (normalizedType) {
      case 'expense_split':
        // Process expense splitting
        if (result.data && result.data.friends) {
          const matchedFriends = [];
          const unmatchedNames = [];
          
          for (const friendData of result.data.friends) {
            // Extract friend name from either string or object format
            const friendName = typeof friendData === 'string' ? friendData : (friendData.name || friendData.toString());
            
            console.log(`Looking for friend: "${friendName}"`);
            console.log('Available friends:', friendsArray.map((f: any) => f.name));
            
            // Normalize whitespace for comparison
            const normalizedSearchName = friendName.toLowerCase().replace(/\s+/g, ' ').trim();
            
            const friend = friendsArray.find((f: any) => {
              const normalizedFriendName = f.name.toLowerCase().replace(/\s+/g, ' ').trim();
              return normalizedFriendName === normalizedSearchName ||
                     normalizedFriendName.includes(normalizedSearchName) ||
                     normalizedSearchName.includes(normalizedFriendName);
            });
            
            console.log(`Match found for "${friendName}":`, friend?.name || 'NO MATCH');
            
            if (friend) {
              matchedFriends.push({
                id: friend.id,
                name: friend.name,
                email: friend.email
              });
            } else {
              unmatchedNames.push(friendName);
            }
          }
          
          if (unmatchedNames.length > 0) {
            const suggestions = [];
            for (const unmatchedName of unmatchedNames) {
              const similarFriends = friendsArray.filter((f: any) => 
                f.name.toLowerCase().includes(unmatchedName.toLowerCase().substring(0, 3)) ||
                unmatchedName.toLowerCase().includes(f.name.toLowerCase().substring(0, 3))
              ).slice(0, 3);
              
              if (similarFriends.length > 0) {
                suggestions.push({
                  searched: unmatchedName,
                  suggestions: similarFriends.map((f: any) => ({
                    id: f.id,
                    name: f.name,
                    email: f.email
                  }))
                });
              }
            }
            
            return NextResponse.json({
              success: false,
              error: 'friends_not_found',
              message: `I couldn't find these friends: ${unmatchedNames.join(', ')}. Please check the spelling or add them as friends first.`,
              unmatchedNames,
              suggestions,
              availableFriends: friendsArray.map((f: any) => ({ id: f.id, name: f.name, email: f.email }))
            });
          }
          
          // Use the splitting logic from Gemini
          const expense = await geminiAssistant.splitExpense(
            message, // Pass the original message which contains percentage info
            matchedFriends,
            currentUser,
            result.data.amount,
            result.data.category
          );
          
          // Also include subcategory information if available
          if (expense.subcategory) {
            result.data.subcategory = expense.subcategory;
          }
          
          return NextResponse.json({
            success: true,
            type: 'expense_split',
            expense: expense,
            subcategory: expense.subcategory // Include subcategory in response
          });
        }
        break;

      case 'analytics':
      case 'expense_history': {
        console.log('📊 [ANALYTICS] Processing analytics request:', result.data);
        
        // Handle top categories queries
        if (result.data?.query_type === 'top_categories' || 
            (result.message && result.message.toLowerCase().includes('top') && result.message.toLowerCase().includes('categor'))) {
          console.log('📊 [ANALYTICS] Getting top spending categories');
          
          try {
            const { getTopSpendingCategories } = await import('../../../../lib/database-functions');
            const topCategories = await getTopSpendingCategories(userId, 'this_month', 3);
            
            if (topCategories && topCategories.length > 0) {
              const categoryList = topCategories
                .map((cat, index) => `${index + 1}. ${cat.category}: $${cat.total}`)
                .join('\n');
              
              const totalSpent = topCategories.reduce((sum, cat) => sum + parseFloat(cat.total), 0);
              
              return NextResponse.json({
                success: true,
                type: 'analytics_response',
                data: {
                  categories: topCategories,
                  totalSpent,
                  timeframe: 'this_month'
                },
                message: `Here are your top 3 spending categories this month:\n\n${categoryList}\n\nTotal: $${totalSpent.toFixed(2)}`
              });
            } else {
              return NextResponse.json({
                success: true,
                type: 'analytics_response',
                message: "You haven't made any expenses this month yet. Start tracking your spending to see your top categories!"
              });
            }
          } catch (error) {
            console.error('Error getting top categories:', error);
            return NextResponse.json({
              success: true,
              type: 'analytics_response',
              message: "I couldn't retrieve your spending categories right now. Please try again."
            });
          }
        }
        
        // Handle different types of analytics queries
        if (result.data?.query_type === 'spending_by_category' || result.data?.category) {
          // Handle category-specific spending queries like "food spending"
          const category = result.data.category || result.data.query_category;
          const timeframe = result.data.timeframe || 'this_month';
          
          console.log(`📊 [ANALYTICS] Getting ${category} spending for ${timeframe}`);
          
          try {
            const { getSpendingByCategory } = await import('../../../../lib/database-functions');
            const spending = await getSpendingByCategory(userId, category, timeframe);
            
            return NextResponse.json({
              success: true,
              type: 'analytics_response',
              data: {
                category,
                timeframe,
                amount: spending.total,
                breakdown: spending.breakdown || []
              },
              message: `You spent $${spending.total} on ${category} ${timeframe === 'this_month' ? 'this month' : timeframe}.`
            });
          } catch (error) {
            console.error('Error getting category spending:', error);
            return NextResponse.json({
              success: true,
              type: 'analytics_response',
              message: `I couldn't retrieve your ${category} spending data right now. Please try again.`
            });
          }
        }
        
        // Handle friend balance queries (existing logic)
        let friendsToCheck = [];
        if (Array.isArray(result.data)) {
          friendsToCheck = result.data;
        } else if (result.data?.friends) {
          friendsToCheck = result.data.friendsArray.map((name: string) => ({ friend: name, query_type: result.data.query_type || 'owes' }));
        } else if (result.data?.friend) {
          friendsToCheck = [{ friend: result.data.friend, query_type: result.data.query_type || 'owes' }];
        }
        
        if (friendsToCheck.length > 0) {
          // Find friend IDs by name (case-insensitive)
          const friendResults = [];
          for (const entry of friendsToCheck) {
            const friendName = entry.friend;
            console.log(friendName);
            // Use friendsArray for lookup
            const friendObj = friendsArray.find((f: any) => f.name.toLowerCase() === friendName.toLowerCase());
            if (!friendObj) {
              friendResults.push({ friend: friendName, error: 'Friend not found' });
              continue;
            }
            const { getFriendBalance } = await import('../../../../lib/database-functions');
            const balance = await getFriendBalance(userId, friendObj.id);
            friendResults.push({
              friend: friendObj.name,
              friendId: friendObj.id,
              balance,
              message: balance > 0 ? `${friendObj.name} owes you $${balance}` : balance < 0 ? `You owe ${friendObj.name} $${-balance}` : `You and ${friendObj.name} are settled up.`
            });
          }
          return NextResponse.json({
            success: true,
            type: 'friend_info',
            results: friendResults,
            message: friendResults.map(r => r.message).join(' ')
          });
        }
        
        // Fallback for general analytics
        return NextResponse.json({
          success: true,
          type: 'analytics_response',
          message: result.message || "I can help you with spending analytics. Try asking about specific categories like 'food' or 'transport'."
        });
      }

      case 'friend_info': {
        // Handle friend balance queries
        let friendsToCheck = [];
        if (Array.isArray(result.data)) {
          friendsToCheck = result.data;
        } else if (result.data?.friends) {
          friendsToCheck = result.data.friends.map((name: string) => ({ friend: name, query_type: result.data.query_type || 'owes' }));
        } else if (result.data?.friend) {
          friendsToCheck = [{ friend: result.data.friend, query_type: result.data.query_type || 'owes' }];
        }
        
        if (friendsToCheck.length > 0) {
          const friendResults = [];
          for (const entry of friendsToCheck) {
            const friendName = entry.friend;
            const friendObj = friendsArray.find((f: any) => f.name.toLowerCase() === friendName.toLowerCase());
            if (!friendObj) {
              friendResults.push({ friend: friendName, error: 'Friend not found' });
              continue;
            }
            const { getFriendBalance } = await import('../../../../lib/database-functions');
            const balance = await getFriendBalance(userId, friendObj.id);
            friendResults.push({
              friend: friendObj.name,
              friendId: friendObj.id,
              balance,
              message: balance > 0 ? `${friendObj.name} owes you $${balance}` : balance < 0 ? `You owe ${friendObj.name} $${-balance}` : `You and ${friendObj.name} are settled up.`
            });
          }
          return NextResponse.json({
            success: true,
            type: 'friend_info',
            results: friendResults,
            message: friendResults.map(r => r.message).join(' ')
          });
        }
        break;
      }

      default:
        return NextResponse.json({
          success: true,
          type: result.type,
          message: result.message || result.intent
        });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error parsing chat message:', error);
    return NextResponse.json({
      success: false,
      message: "Sorry, I had trouble understanding your request. Please try again."
    }, { status: 500 });
  }
}
