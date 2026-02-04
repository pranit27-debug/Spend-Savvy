import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { connectToPostgres } from '../../../../lib/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

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

    const currentUser = userResult.rows[0];

    // Get all user's friends
    const friendsResult = await db.query(
      `SELECT u.id, u.name, u.email 
       FROM users u 
       INNER JOIN friends f ON u.id = f.friend_id 
       WHERE f.user_id = $1`,
      [userId]
    );
    const friends = friendsResult.rows;

    // Use Gemini to parse the expense message
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are an AI assistant that parses expense splitting requests from natural language. 

User message: "${message}"

Current user: ${currentUser.name}
Available friends: ${friends.map(f => f.name).join(', ')}

Parse this message and extract:
1. The expense description
2. Total amount (if mentioned)
3. Category
4. Which friends to split with (match names from available friends list)
5. Any special splitting instructions

IMPORTANT RULES:
- When the user says "me", "myself", "I", they are referring to themselves (${currentUser.name})
- DO NOT include the current user (${currentUser.name}) in the friendNames array
- Only include OTHER people (friends) in the friendNames array
- The current user is automatically included in the split
- "Split between me and John" means split between ${currentUser.name} (current user) and John (friend)

Examples:
- "Split $50 between me and Swasthik" → friendNames: ["Swasthik"] (current user ${currentUser.name} is automatically included)
- "Split dinner with John and Mary" → friendNames: ["John", "Mary"] (current user ${currentUser.name} is automatically included)

If friends are mentioned by name, try to match them with the available friends list. If no amount is mentioned, estimate a reasonable amount. If no category is mentioned, categorize based on the description.

Respond with a JSON object in this exact format:
{
  "success": true,
  "expense": {
    "description": "cleaned up description",
    "amount": number,
    "category": "expense category",
    "friendNames": ["friend1", "friend2"],
    "friendIds": ["id1", "id2"],
    "splitType": "equal",
    "confidence": number (0-1),
    "reasoning": "explanation of what was parsed"
  },
  "needsConfirmation": true,
  "confirmationMessage": "I understood you want to split X for Y with Z. Is this correct?"
}

If the message is not about expense splitting, respond with:
{
  "success": false,
  "message": "I didn't understand that as an expense splitting request. Try something like 'Split $50 for dinner with John and Mary'"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        message: "I couldn't understand your request. Try something like 'Split $50 for dinner with John and Mary'"
      });
    }
    
    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    if (parsedResponse.success) {
      // Match friend names to IDs
      const matchedFriends = [];
      const unmatchedNames = [];
      
      for (const friendName of parsedResponse.expense.friendNames || []) {
        const friend = friends.find(f => 
          f.name.toLowerCase().includes(friendName.toLowerCase()) ||
          friendName.toLowerCase().includes(f.name.toLowerCase())
        );
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
      
      // If there are unmatched names, return error with suggestions
      if (unmatchedNames.length > 0) {
        // Try to find similar names for suggestions
        const suggestions = [];
        for (const unmatchedName of unmatchedNames) {
          const similarFriends = friends.filter(f => 
            f.name.toLowerCase().includes(unmatchedName.toLowerCase().substring(0, 3)) ||
            unmatchedName.toLowerCase().includes(f.name.toLowerCase().substring(0, 3))
          ).slice(0, 3);
          
          if (similarFriends.length > 0) {
            suggestions.push({
              searched: unmatchedName,
              suggestions: similarFriends.map(f => ({
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
          availableFriends: friends.map(f => ({ id: f.id, name: f.name, email: f.email }))
        });
      }
      
      parsedResponse.expense.matchedFriends = matchedFriends;
      parsedResponse.expense.allParticipants = [currentUser, ...matchedFriends];
    }
    
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error parsing chat message:', error);
    return NextResponse.json({
      success: false,
      message: "Sorry, I had trouble understanding your request. Please try again."
    }, { status: 500 });
  }
}
