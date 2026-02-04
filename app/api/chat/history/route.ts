import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';

// Helper: get chat list key
const chatListKey = (userId: string) => `chat_list:${userId}`;
// Helper: get chat history key
const chatHistoryKey = (userId: string, chatId: string) => `chat_history:${userId}:${chatId}`;

// POST: Save chat history for a user/chat
export async function POST(req: NextRequest) {
  try {
    const { userId, history, chatId, title } = await req.json();
    if (!userId || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Missing userId or history' }, { status: 400 });
    }
    let newChatId = chatId;
    if (!chatId) {
      // Create new chat
      newChatId = uuidv4();
    }
    // Save chat history
    await cache.set(chatHistoryKey(userId, newChatId), history, 60 * 60 * 24 * 30); // 30 days expiry
    // Update chat list (store metadata: id, title, lastUpdated)
    let chatList = (await cache.get(chatListKey(userId))) || [];
    if (!Array.isArray(chatList)) chatList = [];
    // Remove if already exists (move to top)
    chatList = chatList.filter((c: any) => c.id !== newChatId);
    // Use first message or provided title as chat title
    const chatTitle = title || (history[0]?.content?.slice(0, 40) || 'New Chat');
    chatList.unshift({ id: newChatId, title: chatTitle, lastUpdated: Date.now() });
    // Keep only 5 most recent
    if (chatList.length > 5) chatList = chatList.slice(0, 5);
    await cache.set(chatListKey(userId), chatList, 60 * 60 * 24 * 30);
    return NextResponse.json({ success: true, chatId: newChatId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save chat history' }, { status: 500 });
  }
}

// GET: List chats or get chat history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const list = searchParams.get('list');
    const chatId = searchParams.get('chatId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    if (list === 'true') {
      // Return chat list (metadata)
      const chatList = (await cache.get(chatListKey(userId))) || [];
      return NextResponse.json({ chats: chatList });
    }
    if (chatId) {
      // Return specific chat history
      const history = await cache.get(chatHistoryKey(userId, chatId));
      return NextResponse.json({ history: history || [] });
    }
    return NextResponse.json({ error: 'Missing chatId or list param' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 });
  }
}

// PATCH: Rename a chat
export async function PATCH(req: NextRequest) {
  try {
    const { userId, chatId, title } = await req.json();
    if (!userId || !chatId || !title) {
      return NextResponse.json({ error: 'Missing userId, chatId, or title' }, { status: 400 });
    }
    let chatList = (await cache.get(chatListKey(userId))) || [];
    if (!Array.isArray(chatList)) chatList = [];
    chatList = chatList.map((c: any) => c.id === chatId ? { ...c, title } : c);
    await cache.set(chatListKey(userId), chatList, 60 * 60 * 24 * 30);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rename chat' }, { status: 500 });
  }
}

// DELETE: Delete a chat
export async function DELETE(req: NextRequest) {
  try {
    const { userId, chatId } = await req.json();
    if (!userId || !chatId) {
      return NextResponse.json({ error: 'Missing userId or chatId' }, { status: 400 });
    }
    // Remove chat from chat list
    let chatList = (await cache.get(chatListKey(userId))) || [];
    if (!Array.isArray(chatList)) chatList = [];
    chatList = chatList.filter((c: any) => c.id !== chatId);
    await cache.set(chatListKey(userId), chatList, 60 * 60 * 24 * 30);
    // Delete chat history
    await cache.del(chatHistoryKey(userId, chatId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
