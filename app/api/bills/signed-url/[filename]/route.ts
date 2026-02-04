import { NextRequest, NextResponse } from 'next/server';
import { generateSignedUrl } from '@/lib/aws-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Security: Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await generateSignedUrl(filename, 3600);

    return NextResponse.json({
      success: true,
      url: signedUrl,
      filename: filename,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
