import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const BUCKET_NAME = 'bitmesra';

// Upload file to S3
export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  try {
    console.log('🚀 Starting S3 upload...');
    console.log('  - Filename:', filename);
    console.log('  - Content Type:', contentType);
    console.log('  - File Size:', file.length, 'bytes');
    console.log('  - Bucket:', BUCKET_NAME);
    console.log('  - Region:', process.env.AWS_REGION);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `bills/${filename}`,
      Body: file,
      ContentType: contentType,
      // Optional: Add metadata
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log('📤 Sending S3 command...');
    const result = await s3Client.send(command);
    console.log('✅ S3 upload result:', result);
    
    // Return the S3 object key (path)
    const s3Key = `bills/${filename}`;
    console.log('🎯 S3 Key:', s3Key);
    return s3Key;
  } catch (error) {
    console.error('❌ S3 Upload Error Details:');
    console.error('  - Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('  - Error message:', error instanceof Error ? error.message : error);
    console.error('  - Full error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

// Generate signed URL for accessing private S3 objects
export async function generateSignedUrl(
  filename: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename.startsWith('bills/') ? filename : `bills/${filename}`,
    });

    // Generate signed URL for GET request
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

// Delete file from S3
export async function deleteFromS3(filename: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename.startsWith('bills/') ? filename : `bills/${filename}`,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
}

// Check if S3 is configured
export function isS3Configured(): boolean {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  
  const isConfigured = !!(region && accessKeyId && secretAccessKey && bucketName);
  
  console.log('🔧 S3 Configuration Check:');
  console.log('  - Region:', region || 'NOT SET');
  console.log('  - Access Key ID:', accessKeyId ? 'SET' : 'NOT SET');
  console.log('  - Secret Access Key:', secretAccessKey ? 'SET' : 'NOT SET');
  console.log('  - Bucket Name:', bucketName || 'NOT SET');
  console.log('  - Is Configured:', isConfigured);
  
  return isConfigured;
}

// Get public URL for S3 object (if bucket is public)
export function getS3PublicUrl(filename: string): string {
  const key = filename.startsWith('bills/') ? filename : `bills/${filename}`;
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export { s3Client, BUCKET_NAME };
