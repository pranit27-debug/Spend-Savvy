import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExpenseSplit {
  description: string;
  category: string;
  subcategory?: string;
  totalAmount: number;
  currency: string;
  splits: {
    userId: string;
    userName: string;
    amount: number;
    percentage: number;
  }[];
  reasoning: string;
  error?: string; // Add error field for validation issues
}

export interface Friend {
  id: string;
  name: string;
  email: string;
}

export interface QueryResult {
  type: 'expense_split' | 'analytics' | 'expense_history' | 'friend_info' | 'general_chat' | 'unknown';
  intent: string;
  data?: any;
  needsConfirmation?: boolean;
  message?: string;
  error?: string; // Add error field
}

export interface AnalyticsQuery {
  timeframe: string; // 'this_month', 'last_month', 'this_year', 'last_week', etc.
  category?: string;
  subcategory?: string;
  friend?: string;
  type: 'total_spent' | 'category_breakdown' | 'friend_expenses' | 'monthly_comparison';
}

export class GeminiExpenseAssistant {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async processUserMessage(
    message: string,
    userContext: {
      userId: string;
      userName: string;
      friends: Friend[];
      conversationHistory?: any[];
      pendingConfirmation?: any;
    }
  ): Promise<QueryResult> {
    console.log('Gemini processUserMessage called with:', { message, userContext });
    console.log(userContext.friends, "Friends");
    
    // Check if this message is responding to a pending confirmation
    if (userContext.pendingConfirmation && (
      message.toLowerCase().includes('yes') || 
      message.toLowerCase().includes('confirm') ||
      message.toLowerCase().includes('correct') ||
      message.toLowerCase().includes('looks good') ||
      message.toLowerCase().includes('ok') ||
      message.toLowerCase().includes('sure')
    )) {
      return {
        type: 'expense_split',
        intent: 'User confirmed the expense split',
        data: userContext.pendingConfirmation,
        needsConfirmation: false
      };
    }

    // Check if this message is modifying a pending confirmation
    if (userContext.pendingConfirmation && (
      message.toLowerCase().includes('no') ||
      message.toLowerCase().includes('wrong') ||
      message.toLowerCase().includes('change') ||
      message.toLowerCase().includes('should be') ||
      message.toLowerCase().includes('subcategory')
    )) {
      // Handle subcategory changes
      if (message.toLowerCase().includes('subcategory')) {
        const subcategoryMatch = message.match(/subcategory.*should be\s+(\w+)/i) || 
                               message.match(/should be\s+(\w+)/i) ||
                               message.match(/no.*(\w+)/i);
        
        if (subcategoryMatch) {
          const newSubcategory = subcategoryMatch[1];
          const updatedExpense = {
            ...userContext.pendingConfirmation,
            subcategory: newSubcategory
          };
          
          return {
            type: 'expense_split',
            intent: `User wants to change subcategory to ${newSubcategory}`,
            data: updatedExpense,
            needsConfirmation: true,
            message: `Updated subcategory to "${newSubcategory}". Does this look correct now?`
          };
        }
      }
    }

    // Include conversation history in the prompt for better context
    let conversationContext = '';
    if (userContext.conversationHistory && userContext.conversationHistory.length > 0) {
      conversationContext = `
Recent conversation:
${userContext.conversationHistory.map(msg => 
  `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
).join('\n')}

Current message: "${message}"
`;
    }
    
    const prompt = `
You are an AI expense management assistant. Analyze the user's message and determine what they want to do.

${conversationContext || `User message: "${message}"`}
User: ${userContext.userName}
Available friends: ${userContext.friends.map(f => f.name).join(', ')}

Classify the message into one of these categories and extract relevant information:

1. EXPENSE_SPLIT: User wants to split an expense
   - Extract: description, amount, friends involved, category
   - Format: expense splitting request
   
   CRITICAL USER INCLUSION RULES:
   - Include the current user (${userContext.userName}) ONLY if the message explicitly mentions "me", "myself", "I", or equivalent references to the speaker.
   - Do not include the current user if no such mention is present.
   - "split between X and Y" = ONLY X and Y are included (current user NOT included unless mentioned)
   - "split $500 between 2 people" = find 2 people from friends list (current user NOT included unless mentioned)
   - ANY explicit mention of "me", "I", "myself" = current user MUST be included
   
   PERCENTAGE SPLITS: If message contains percentages like "John (30%)", "Mary (25%)", "rest on me"
   - Extract EXACT percentages mentioned
   - Do NOT convert to equal splits when percentages are specified
   - Use 5% tolerance for percentage validation (95-105% is acceptable)
   - If percentages exceed 105%, flag as error

2. ANALYTICS: User wants spending analytics/insights
   - Extract: timeframe (this month, last month, etc.), category, subcategory, friend
   - Types: total spent, category breakdown, friend expenses, comparisons
   - Examples: "how much did I spend last month", "show my food expenses", "spending with John"
   - Subcategory examples: "how much on F1", "coffee expenses", "pizza spending"
   - If user mentions specific items like "F1", "pizza", "coffee", treat as subcategory under appropriate main category

3. EXPENSE_HISTORY: User wants to see past expenses
   - Extract: timeframe, category, friend, limit
   - Examples: "show my recent expenses", "what did I buy last week", "Show me my top 3 spends this month"
   - IMPORTANT: For "top X" requests, set limit to X and set type to "top_expenses"
   - For "top 3 spends", set: {"timeframe": "this_month", "type": "top_expenses", "limit": 3}

4. FRIEND_INFO: User wants friend-related information (e.g., balances, who owes whom, etc.)
   - Extract: friend name(s), query type (e.g., 'balance', 'owes', 'lent', etc.)
   - Examples: "how much does Amit owe me?", "who owes me money?", "my balance with Sarah"
   - If multiple friends are mentioned, return an array of results, one per friend

5. GENERAL_CHAT: General conversation, greetings, help requests
   - Provide helpful responses about app features

6. UNKNOWN: Cannot determine intent

Respond with a JSON object in this exact format:
{
  "type": "category_from_above",
  "intent": "detailed description of what user wants",
  "data": {
    // Relevant extracted data based on type
    // For expense_split: {"description": "", "amount": number, "friends": [], "category": "", "includeCurrentUser": boolean}
    //   * includeCurrentUser: true ONLY if user mentions "me", "I", "myself" explicitly
    //   * friends: array of friend names to include (excluding current user)
    // For analytics: {"timeframe": "", "type": "", "category": "", "subcategory": "", "friend": ""}
    // For expense_history: {"timeframe": "", "category": "", "friend": "", "limit": number, "type": "top_expenses|recent|all"}
    // For friend_info: {"friends": ["Amit", "Sarah"], "query_type": "owes|balance|lent|etc."}
  },
  "needsConfirmation": false,
  "message": "brief acknowledgment that you understand the request - DO NOT provide the actual data",
  "error": "error message if validation fails (e.g., percentages > 105%, amounts > total, etc.)"
}

CRITICAL VALIDATION RULES (5% tolerance):
- If percentages are mentioned and they add up to more than 105%, set error field
- If percentages are less than 95%, warn but don't error (may be partial specification)
- If individual amounts are mentioned and they exceed the total, set error field
- If "split between X people" but fewer than X friends are identified, set error field
- The message field should ONLY acknowledge the request, never provide actual data

Examples of user inclusion logic:
- "split $100 between John and Mary" → includeCurrentUser: false, friends: ["John", "Mary"]
- "split $100 between me and John" → includeCurrentUser: true, friends: ["John"]
- "I want to split $100 with John" → includeCurrentUser: true, friends: ["John"]
- "split $100 with John" → includeCurrentUser: false, friends: ["John"]
- "me and John split $100" → includeCurrentUser: true, friends: ["John"]
- "split $100 between 2 people" → includeCurrentUser: false, friends: [first 2 available friends]

CATEGORY AND SUBCATEGORY MAPPING:
- "F1", "formula 1", "race" → category: "Entertainment", subcategory: "F1"
- "pizza", "burger", "coffee", restaurant names → category: "Food", subcategory: specific item
- "uber", "taxi", "metro", "bus" → category: "Transportation", subcategory: specific service
- "movie", "cinema", "concert" → category: "Entertainment", subcategory: specific type
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('No JSON found in Gemini response:', text);
        return {
          type: 'unknown',
          intent: 'Could not parse user intent',
          message: "I didn't understand that. Try asking about expenses, analytics, or splitting costs with friends."
        };
      }
      
      let parsedResponse;
      try {
        // Clean the JSON before parsing
        const cleanedJson = this.cleanAndValidateJson(jsonMatch[0]);
        parsedResponse = JSON.parse(cleanedJson);
        console.log('Parsed Gemini response:', parsedResponse);
      } catch (parseError) {
        console.error('JSON parsing error in processUserMessage:', parseError);
        console.error('Problematic JSON:', jsonMatch[0]);
        return {
          type: 'unknown',
          intent: 'JSON parsing failed',
          message: "I had trouble understanding your request. Please try rephrasing it."
        };
      }
      
      return parsedResponse as QueryResult;
      
    } catch (error) {
      console.error('Error processing user message:', error);
      return {
        type: 'unknown',
        intent: 'Error processing message',
        message: "Sorry, I had trouble understanding your request. Please try again."
      };
    }
  }

  // Enhanced percentage parser with 5% tolerance and better "me" handling
  private parsePercentages(
    message: string, 
    friends: Friend[], 
    currentUser: { id: string; name: string },
    totalAmount: number,
    includeCurrentUser: boolean = true
  ): ExpenseSplit | null {
    try {
      // Better regex to extract names with percentages, including "me"
      const percentagePattern = /(?:^|[^a-zA-Z])(me|myself|I|[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*\((\d+(?:\.\d+)?)%\)/gi;
      const matches = [...message.matchAll(percentagePattern)];
      
      console.log('Percentage matches found:', matches.map(m => ({ name: m[1].trim(), percentage: m[2] })));
      
      if (matches.length === 0) return null;
      
      const availableParticipants = includeCurrentUser ? [currentUser, ...friends] : friends;
      const splits: Array<{
        userId: string;
        userName: string;
        amount: number;
        percentage: number;
      }> = [];
      let totalPercentage = 0;
      
      // Process explicit percentages
      for (const match of matches) {
        let namepart = match[1].trim().toLowerCase();
        const percentage = parseFloat(match[2]);
        
        // Validate percentage is reasonable
        if (percentage <= 0 || percentage > 100) {
          console.log(`Invalid percentage: ${percentage}%`);
          continue;
        }
        
        // Remove common prefixes that might have been captured
        namepart = namepart.replace(/^(with|and|,)\s+/i, '').trim();
        
        console.log(`Looking for participant with namepart: "${namepart}"`);
        console.log('Available participants:', availableParticipants.map(p => p.name));
        
        // Handle "me", "myself", "I" references
        if (['me', 'myself', 'i'].includes(namepart)) {
          if (includeCurrentUser) {
            const existingUserSplit = splits.find(s => s.userId === currentUser.id);
            if (!existingUserSplit) {
              const amount = Math.round((totalAmount * percentage / 100) * 100) / 100;
              splits.push({
                userId: currentUser.id,
                userName: currentUser.name,
                amount: amount,
                percentage: percentage
              });
              totalPercentage += percentage;
              console.log(`Added current user split: ${currentUser.name} gets ${percentage}% = $${amount}`);
              continue;
            }
          }
        }
        
        // Find the best match for other names
        let bestMatch = null;
        let bestScore = 0;
        
        for (const participant of availableParticipants) {
          // Skip current user if already handled above
          if (participant.id === currentUser.id) continue;
          
          const normalizedParticipantName = participant.name.toLowerCase().replace(/\s+/g, ' ').trim();
          const normalizedNamepart = namepart.replace(/\s+/g, ' ').trim();
          
          // Check if this participant is already in splits
          const alreadyExists = splits.find(s => s.userId === participant.id);
          if (alreadyExists) continue;
          
          let score = 0;
          
          // Exact match gets highest score
          if (normalizedParticipantName === normalizedNamepart) {
            score = 100;
          }
          // Check if participant name contains the namepart
          else if (normalizedParticipantName.includes(normalizedNamepart)) {
            score = 80;
          }
          // Check if namepart contains participant name
          else if (normalizedNamepart.includes(normalizedParticipantName)) {
            score = 70;
          }
          // Check word matches
          else {
            const participantWords = normalizedParticipantName.split(' ');
            const namepartWords = normalizedNamepart.split(' ');
            
            const matchingWords = participantWords.filter(word => 
              word.length > 2 && namepartWords.some(nw => nw.includes(word) || word.includes(nw))
            );
            
            if (matchingWords.length > 0) {
              score = Math.min(60, matchingWords.length * 20);
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = participant;
          }
        }
        
        console.log(`Best match for "${namepart}":`, bestMatch?.name || 'No match', `(score: ${bestScore})`);
        
        if (bestMatch && bestScore >= 60) {
          const amount = Math.round((totalAmount * percentage / 100) * 100) / 100;
          splits.push({
            userId: bestMatch.id,
            userName: bestMatch.name,
            amount: amount,
            percentage: percentage
          });
          totalPercentage += percentage;
        }
      }
      
      // Handle "rest on me" - only if current user should be included
      if (includeCurrentUser && (message.toLowerCase().includes('rest on me') || message.toLowerCase().includes('remaining on me'))) {
        const remainingPercentage = 100 - totalPercentage;
        console.log(`Calculating "rest on me": remaining percentage = ${remainingPercentage}%`);
        
        if (remainingPercentage > 0) {
          const existingUserSplit = splits.find(s => s.userId === currentUser.id);
          if (!existingUserSplit) {
            const remainingAmount = Math.round((totalAmount * remainingPercentage / 100) * 100) / 100;
            splits.push({
              userId: currentUser.id,
              userName: currentUser.name,
              amount: remainingAmount,
              percentage: remainingPercentage
            });
            console.log(`Added "rest on me" split: ${currentUser.name} gets ${remainingPercentage}% = $${remainingAmount}`);
          }
        }
      }
      
      console.log('Final splits before validation:', splits);
      
      // Enhanced validation with 5% tolerance
      if (splits.length === 0) {
        console.log('No splits found, returning null');
        return null;
      }
      
      let totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
      const totalSplitPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
      
      console.log(`Validation: totalSplitAmount=${totalSplitAmount}, expected=${totalAmount}, totalSplitPercentage=${totalSplitPercentage}`);
      
      // Adjust for rounding errors to make sum exact
      const roundingDiff = totalAmount - totalSplitAmount;
      if (Math.abs(roundingDiff) > 0 && splits.length > 0) {
        // Add the difference to the largest split (round up adjustment)
        splits.sort((a, b) => b.amount - a.amount); // Sort descending by amount
        splits[0].amount = Math.round((splits[0].amount + roundingDiff) * 100) / 100;
        totalSplitAmount = totalAmount; // Now it matches
        console.log(`Adjusted for rounding: added $${roundingDiff.toFixed(2)} to ${splits[0].userName}`);
      }
      
      // Check for invalid scenarios with 5% tolerance
      let errorMessage = '';
      
      // Check if percentages exceed 105% (5% tolerance)
      if (totalSplitPercentage > 105.0) {
        errorMessage = `Percentages add up to ${totalSplitPercentage.toFixed(1)}%, which exceeds the 5% tolerance limit (105%). Please adjust the percentages.`;
      }
      
      // Check if any individual amount exceeds total
      const maxIndividualAmount = Math.max(...splits.map(s => s.amount));
      if (maxIndividualAmount > totalAmount) {
        const offendingSplit = splits.find(s => s.amount === maxIndividualAmount);
        errorMessage = `${offendingSplit?.userName}'s amount ($${maxIndividualAmount}) exceeds the total amount ($${totalAmount}).`;
      }
      
      // Check if total split amount significantly differs from expected (allowing 5% tolerance)
      const tolerance = totalAmount * 0.05; // 5% tolerance
      if (Math.abs(totalSplitAmount - totalAmount) > Math.max(tolerance, 0.02)) {
        errorMessage = `Split amounts total $${totalSplitAmount.toFixed(2)} but expense is $${totalAmount.toFixed(2)}. This exceeds the 5% tolerance range.`;
      }
      
      // Warn if percentages are less than 95% but don't error
      if (totalSplitPercentage < 95.0 && totalSplitPercentage > 0) {
        console.warn(`Percentages only add up to ${totalSplitPercentage.toFixed(1)}%. This might be a partial specification.`);
      }
      
      if (errorMessage) {
        return {
          description: `Invalid percentage-based split: ${splits.map(s => `${s.userName} (${s.percentage}%)`).join(', ')}`,
          category: 'Groceries',
          totalAmount: totalAmount,
          currency: 'USD',
          splits: splits,
          reasoning: `Error in split calculation: ${errorMessage}`,
          error: errorMessage
        };
      }
      
      return {
        description: `Percentage-based split: ${splits.map(s => `${s.userName} (${s.percentage}%)`).join(', ')}`,
        category: 'Groceries',
        totalAmount: totalAmount,
        currency: 'USD',
        splits: splits,
        reasoning: `Split based on specified percentages with 5% tolerance: ${splits.map(s => `${s.userName} pays ${s.percentage}% = $${s.amount}`).join(', ')}`
      };
      
    } catch (error) {
      console.error('Error parsing percentages:', error);
      return null;
    }
  }

  async splitExpense(
    description: string,
    friends: Friend[],
    currentUser: { id: string; name: string },
    totalAmount?: number,
    category?: string,
    includeCurrentUser: boolean = true
  ): Promise<ExpenseSplit> {
    // First try to parse percentages directly from the description
    if (totalAmount && description.includes('%')) {
      console.log('Attempting percentage parsing for:', description);
      const percentageSplit = this.parsePercentages(description, friends, currentUser, totalAmount, includeCurrentUser);
      if (percentageSplit) {
        console.log('Successfully parsed percentages:', percentageSplit);
        return percentageSplit;
      }
    }
    
    // Determine participants based on includeCurrentUser flag
    const allParticipants = includeCurrentUser ? [currentUser, ...friends] : friends;
    
    // Validate that we have participants
    if (allParticipants.length === 0) {
      return {
        description: description,
        category: category || 'Miscellaneous',
        totalAmount: totalAmount || 0,
        currency: 'USD',
        splits: [],
        reasoning: 'No participants available for splitting',
        error: 'No participants specified for the expense split'
      };
    }
    
    const prompt = `
You are an AI expense splitting assistant. Based on the given description, analyze and split the expense fairly among the participants.

Expense Description: "${description}"
Total Amount: ${totalAmount ? `$${totalAmount}` : 'Not specified (please estimate based on description)'}
Category: ${category || 'Not specified (please categorize based on description)'}

${includeCurrentUser ? `Current User: ${currentUser.name} (ID: ${currentUser.id}) [INCLUDED IN SPLIT]` : `Current User: ${currentUser.name} (ID: ${currentUser.id}) [NOT INCLUDED IN SPLIT]`}

Participants to include in the split:
${allParticipants.map((p, i) => `${i + 1}. ${p.name} (ID: ${p.id})`).join('\n')}

CRITICAL VALIDATION RULES (5% Tolerance):
1. ONLY include the participants listed above in the splits array
2. If specific amounts/percentages are mentioned, validate they don't exceed the total
3. If percentages are specified, ensure they add up to 95-105% (5% tolerance)
4. Each participant's amount must not exceed the total amount
5. If validation fails, set error field with clear explanation
6. Handle "me", "myself", "I" references properly when parsing percentages

Instructions:
1. If total amount is not provided, estimate a reasonable amount based on the description
2. If category is not provided, categorize the expense appropriately
3. Use subcategories when appropriate (e.g., "F1" under "Entertainment", "Pizza" under "Food")
4. If specific percentages are mentioned, use those exact percentages and validate them with 5% tolerance
5. Calculate amounts using: amount = totalAmount × (percentage ÷ 100)
6. Validate all calculations and flag errors if amounts/percentages are invalid
7. Ensure the sum of all split amounts exactly equals the total amount by adjusting for rounding (round to nearest cent and add any difference to the largest share)

Category Guidelines:
- Entertainment: Movies, F1, Sports, Concerts, etc.
- Food: Pizza, Burger, Coffee, Restaurant names, etc.
- Transportation: Uber, Taxi, Bus, Metro, etc.
- Shopping: Clothes, Electronics, Groceries, etc.
- Bills: Electricity, Internet, Phone, etc.

CRITICAL JSON REQUIREMENTS:
- Use double quotes for all strings, never single quotes
- Do not use trailing commas
- Ensure all JSON syntax is valid
- Always include all required fields
- Numbers must be valid (no NaN, Infinity)

Respond with a JSON object in this EXACT format (no additional text before or after):
{
  "description": "cleaned up description",
  "category": "main category (Entertainment, Food, Transportation, etc.)",
  "subcategory": "specific item or null if not applicable",
  "totalAmount": 0.00,
  "currency": "USD",
  "splits": [
    {
      "userId": "user_id_string",
      "userName": "user_name_string", 
      "amount": 0.00,
      "percentage": 0.00
    }
  ],
  "reasoning": "explanation of splitting logic with 5% tolerance applied",
  "error": "error message if validation fails outside 5% tolerance, null otherwise"
}

VALIDATION EXAMPLES (5% Tolerance):
- If asked to split $100 with John (60%) and Mary (50%): error = "Percentages add up to 110%, exceeding 5% tolerance (105%)"
- If asked to split $100 with John (45%) and Mary (45%): no error (90% within 95-105% range)
- If asked to split $100 with John getting $150: error = "John's amount ($150) exceeds total amount ($100)"
- If percentages/amounts are within 5% tolerance: error = null
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw Gemini response for expense splitting:', text);
      
      // Extract JSON from the response
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      }
      
      let rawJson = jsonMatch[0];
      console.log('Extracted JSON string:', rawJson);
      
      rawJson = this.cleanAndValidateJson(rawJson);
      console.log('Cleaned JSON string:', rawJson);
      
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(rawJson);
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError);
        console.error('Problematic JSON:', rawJson);
        throw new Error(`JSON parsing failed: ${parseError.message}`);
      }
      
      console.log('Successfully parsed response:', parsedResponse);
      
      // Validate the response structure
      if (!parsedResponse.splits || !Array.isArray(parsedResponse.splits)) {
        throw new Error('Invalid response structure from AI');
      }
      
      // Additional validation for participant inclusion
      const expectedParticipantIds = allParticipants.map(p => p.id);
      const actualParticipantIds = parsedResponse.splits.map((s: any) => s.userId);
      
      // Check for unexpected participants
      const unexpectedParticipants = actualParticipantIds.filter((id: string) => !expectedParticipantIds.includes(id));
      if (unexpectedParticipants.length > 0) {
        parsedResponse.error = `Unexpected participants included in split`;
        console.warn('Unexpected participants found:', unexpectedParticipants);
      }
      
      // Check for missing expected participants (only if no error already exists)
      if (!parsedResponse.error) {
        const missingParticipants = allParticipants.filter(
          p => !parsedResponse.splits.find((s: any) => s.userId === p.id)
        );
        
        if (missingParticipants.length > 0) {
          // Add missing participants with 0 amount
          missingParticipants.forEach(p => {
            parsedResponse.splits.push({
              userId: p.id,
              userName: p.name,
              amount: 0,
              percentage: 0
            });
          });
        }
      }

      // Adjust for rounding errors to make sum exact if not already
      if (parsedResponse.totalAmount) {
        let totalSplitAmount = parsedResponse.splits.reduce((sum: number, split: any) => sum + split.amount, 0);
        const roundingDiff = parsedResponse.totalAmount - totalSplitAmount;
        if (Math.abs(roundingDiff) > 0 && parsedResponse.splits.length > 0) {
          // Add the difference to the largest split (round up adjustment)
          parsedResponse.splits.sort((a: any, b: any) => b.amount - a.amount); // Sort descending by amount
          parsedResponse.splits[0].amount = Math.round((parsedResponse.splits[0].amount + roundingDiff) * 100) / 100;
          console.log(`Adjusted for rounding in splitExpense: added $${roundingDiff.toFixed(2)} to ${parsedResponse.splits[0].userName}`);
        }
      }
      
      return parsedResponse as ExpenseSplit;
      
    } catch (error) {
      console.error('Error splitting expense with Gemini:', error);
      
      // Fallback to equal split
      const equalAmount = totalAmount ? totalAmount / allParticipants.length : 50 / allParticipants.length;
      const equalPercentage = 100 / allParticipants.length;
      
      return {
        description: description,
        category: category || 'Miscellaneous',
        subcategory: undefined,
        totalAmount: totalAmount || 50,
        currency: 'USD',
        splits: allParticipants.map(p => ({
          userId: p.id,
          userName: p.name,
          amount: Math.round(equalAmount * 100) / 100,
          percentage: Math.round(equalPercentage * 100) / 100
        })),
        reasoning: 'Equal split applied due to AI processing error with 5% tolerance',
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Enhanced JSON cleaning method
  private cleanAndValidateJson(rawJson: string): string {
    let cleaned = rawJson;
    
    // Basic cleaning
    cleaned = cleaned
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
      .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
      .replace(/undefined/g, 'null') // Replace undefined with null
      .replace(/NaN/g, '0') // Replace NaN with 0
      .trim();
    
    // Advanced cleaning for common Gemini issues
    cleaned = cleaned
      .replace(/(\d+)\s*\.\s*/g, '$1.0') // Fix incomplete decimals like "25."
      .replace(/\.\s*(\d+)/g, '.$1') // Fix spaced decimals like ". 50"
      .replace(/([^0-9])\s*\.\s*([^0-9])/g, '$1$2') // Remove stray periods
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
      .replace(/}\s*,\s*]/g, '}]') // Fix object-array comma issues
      .replace(/"\s*:\s*"/g, '": "') // Normalize spacing around colons
      .replace(/"\s*,\s*"/g, '", "'); // Normalize spacing around commas
    
    return cleaned;
  }

  async categorizeExpense(description: string): Promise<string> {
    const prompt = `
Categorize this expense description into one of these categories:
- Food & Dining
- Transportation  
- Entertainment
- Shopping
- Utilities
- Healthcare
- Travel
- Education
- Business
- Miscellaneous

Description: "${description}"

Respond with just the category name, nothing else.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error categorizing expense:', error);
      return 'Miscellaneous';
    }
  }

  async estimateAmount(description: string): Promise<number> {
    const prompt = `
Estimate a reasonable dollar amount for this expense description in USD:
"${description}"

Consider typical costs for such activities/items. 
Respond with just a number (no currency symbol or text), rounded to 2 decimal places.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const amount = parseFloat(response.text().trim());
      return isNaN(amount) ? 50 : Math.max(amount, 0.01); // Minimum $0.01
    } catch (error) {
      console.error('Error estimating amount:', error);
      return 50; // Default fallback amount
    }
  }
}

export const geminiAssistant = new GeminiExpenseAssistant();
export const geminiSplitter = new GeminiExpenseAssistant(); // For backward compatibility