import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Security: Only allow image files and prevent directory traversal
    if (!filename || filename.includes('..') || !filename.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i)) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    }[ext] || 'application/octet-stream';

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Image not found', { status: 404 });
  }
}
