import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getChildSpendingAnalytics, getChildSpendingByCategory, getChildTotalSpending, getChildrenForParent } from '../../../../lib/database-functions';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { message, childId, dateRange } = await request.json();
    
    if (!message) {
      return NextResponse.json({ 
        error: 'Message is required' 
      }, { status: 400 });
    }
    
    // Verify that the requesting user is a parent and has access to this child
    const children = await getChildrenForParent(decoded.userId);
    
    if (childId && !children.some(child => child.child_id === childId)) {
      return NextResponse.json({ 
        error: 'Access denied: Child not found or not linked to your account' 
      }, { status: 403 });
    }
    
    // If no specific child is mentioned, include all children in the context
    const relevantChildren = childId ? children.filter(child => child.child_id === childId) : children;
    
    if (relevantChildren.length === 0) {
      return NextResponse.json({ 
        error: 'No children found. Please add children first.' 
      }, { status: 404 });
    }
    
    // Gather analytics data for relevant children
    const analyticsData = await Promise.all(
      relevantChildren.map(async (child) => {
        const totalSpending = await getChildTotalSpending(child.child_id, dateRange?.startDate, dateRange?.endDate);
        const spendingDetails = await getChildSpendingAnalytics(child.child_id, dateRange?.startDate, dateRange?.endDate);
        const spendingByCategory = await getChildSpendingByCategory(child.child_id, dateRange?.startDate, dateRange?.endDate);
        
        return {
          childName: child.child_name,
          childId: child.child_id,
          threshold: child.threshold_amount,
          totalSpending,
          spendingDetails: spendingDetails.slice(0, 10), // Limit to recent 10 transactions
          spendingByCategory
        };
      })
    );
    
    // Generate AI response using Gemini
    const aiResponse = await generateAnalyticsResponse(message, analyticsData, dateRange);
    
    return NextResponse.json({ 
      success: true, 
      response: aiResponse,
      data: analyticsData
    });
    
  } catch (error: any) {
    console.error('Error in child analytics chat:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process analytics request' 
    }, { status: 500 });
  }
}

async function generateAnalyticsResponse(userMessage: string, analyticsData: any[], dateRange?: { startDate?: string; endDate?: string }) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Format analytics data for AI context
    const contextData = analyticsData.map(child => ({
      name: child.childName,
      totalSpending: child.totalSpending,
      threshold: child.threshold,
      progressPercentage: child.threshold > 0 ? (child.totalSpending / child.threshold * 100).toFixed(1) : 'No threshold set',
      categories: child.spendingByCategory,
      recentTransactions: child.spendingDetails.map((tx: any) => ({
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        date: tx.created_at,
        payer: tx.payer_name
      }))
    }));
    
    const prompt = `
You are a helpful financial analytics assistant for parents monitoring their children's spending. 
Answer the parent's question based on the provided spending data.

USER QUESTION: "${userMessage}"

CHILDREN'S SPENDING DATA:
${JSON.stringify(contextData, null, 2)}

DATE RANGE: ${dateRange ? `${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Current'}` : 'All time'}

INSTRUCTIONS:
- Provide clear, helpful insights about the children's spending patterns
- Include specific numbers and percentages when relevant
- Mention if spending is approaching or exceeding thresholds
- Suggest actionable insights for parents
- Be conversational and supportive
- If asked about a specific child by name, focus on that child
- If multiple children exist and no specific child is mentioned, provide a summary of all children
- Format currency amounts properly (e.g., $12.50)
- Highlight any concerning spending patterns or categories

Keep the response concise but informative (3-5 sentences for simple questions, longer for complex analyses).
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'I apologize, but I encountered an error while analyzing the spending data. Please try again or contact support if the issue persists.';
  }
}
