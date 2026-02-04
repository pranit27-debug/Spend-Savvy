import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    console.log('🧪 Testing S3 Configuration...');
    
    // Check if S3 credentials are configured
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    console.log('Environment variables:');
    console.log('  - AWS_REGION:', region);
    console.log('  - AWS_ACCESS_KEY_ID:', accessKeyId ? 'SET' : 'NOT SET');
    console.log('  - AWS_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET' : 'NOT SET');
    console.log('  - AWS_S3_BUCKET_NAME:', bucketName);

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        success: false,
        error: 'AWS credentials not properly configured',
        missing: {
          region: !region,
          accessKeyId: !accessKeyId,
          secretAccessKey: !secretAccessKey,
          bucketName: !bucketName
        }
      });
    }

    // Test S3 connection
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('Testing S3 connectivity...');
    
    // Test 1: List buckets (to verify credentials)
    try {
      const listCommand = new ListBucketsCommand({});
      const listResponse = await s3Client.send(listCommand);
      console.log('✅ Successfully connected to S3');
      console.log('Available buckets:', listResponse.Buckets?.map(b => b.Name));
      
      // Test 2: Check if our specific bucket exists
      const bucketExists = listResponse.Buckets?.some(bucket => bucket.Name === bucketName);
      console.log('Target bucket exists:', bucketExists);
      
      if (!bucketExists) {
        return NextResponse.json({
          success: false,
          error: `Bucket '${bucketName}' does not exist`,
          availableBuckets: listResponse.Buckets?.map(b => b.Name) || [],
          suggestion: `Please create the bucket '${bucketName}' in the AWS S3 console`
        });
      }
      
      // Test 3: Check bucket accessibility
      try {
        const headCommand = new HeadBucketCommand({ Bucket: bucketName });
        await s3Client.send(headCommand);
        console.log('✅ Bucket is accessible');
        
        return NextResponse.json({
          success: true,
          message: 'S3 configuration is working correctly',
          region,
          bucketName,
          bucketExists: true,
          totalBuckets: listResponse.Buckets?.length || 0
        });
        
      } catch (bucketError) {
        console.error('❌ Bucket access error:', bucketError);
        return NextResponse.json({
          success: false,
          error: `Cannot access bucket '${bucketName}'`,
          details: bucketError instanceof Error ? bucketError.message : 'Unknown error'
        });
      }
      
    } catch (listError) {
      console.error('❌ S3 connection error:', listError);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to S3',
        details: listError instanceof Error ? listError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ S3 test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
}
