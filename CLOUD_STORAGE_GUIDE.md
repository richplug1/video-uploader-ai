# Cloud Storage Configuration Guide

This guide will help you configure cloud storage (AWS S3 or Firebase) for your video uploader application.

## Overview

The application supports multiple storage providers:
- **Local Storage** (default) - Files stored on server filesystem
- **AWS S3** - Files stored in Amazon S3 with optional CloudFront CDN
- **Firebase Storage** (planned) - Files stored in Google Firebase

## Configuration

### 1. Local Storage (Default)

No configuration needed. Files are stored in the `backend/uploads/` directory.

```bash
# In backend/.env
USE_CLOUD_STORAGE=false
CLOUD_STORAGE_PROVIDER=local
```

### 2. AWS S3 Configuration

#### Prerequisites
1. AWS Account with S3 access
2. S3 Bucket created
3. IAM User with S3 permissions
4. Optional: CloudFront distribution for CDN

#### Steps
1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://your-video-bucket-name --region us-west-2
   ```

2. **Create IAM User with S3 permissions:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-video-bucket-name",
           "arn:aws:s3:::your-video-bucket-name/*"
         ]
       }
     ]
   }
   ```

3. **Configure Environment Variables:**
   ```bash
   # In backend/.env
   USE_CLOUD_STORAGE=true
   CLOUD_STORAGE_PROVIDER=aws-s3
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-west-2
   AWS_S3_BUCKET_NAME=your-video-bucket-name
   
   # Optional: CloudFront CDN
   AWS_CLOUDFRONT_URL=https://your-distribution.cloudfront.net
   ```

4. **Bucket Policy (Optional - for public access):**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicRead",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-video-bucket-name/clips/*"
       }
     ]
   }
   ```

### 3. Firebase Storage (Planned)

```bash
# In backend/.env
USE_CLOUD_STORAGE=true
CLOUD_STORAGE_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## Features

### Cloud Storage Features
- ✅ Automatic upload to cloud storage
- ✅ Presigned URL generation for secure sharing
- ✅ CDN delivery support (with CloudFront)
- ✅ Local file cleanup after cloud upload
- ✅ Fallback to local storage if cloud upload fails
- ✅ Cloud and local file deletion
- ✅ File existence checking
- ✅ Metadata retrieval

### Architecture Flow

```
Frontend (React) 
  │
  │ HTTP Requests
  ▼
Backend API (Node/Express) 
  │
  │ Video Processing
  ▼
FFmpeg Engine
  │
  │ Processed Files
  ▼
Cloud Storage (AWS S3 / Firebase)
  │
  │ CDN Delivery
  ▼
User Download/Share
```

## Testing

Run the cloud storage integration test:

```bash
npm run test:cloud-storage
```

Or manually:

```bash
node test-cloud-storage.js
```

## Benefits

### AWS S3 + CloudFront
- **Scalability**: Handle large files and high traffic
- **Global CDN**: Fast delivery worldwide
- **Security**: Presigned URLs for secure access
- **Cost-effective**: Pay only for what you use
- **Reliability**: 99.999999999% (11 9's) durability

### Local Storage (Development)
- **No setup**: Works immediately
- **No costs**: Free storage
- **Simple debugging**: Easy file access
- **Offline development**: No internet required

## Migration

### From Local to Cloud
1. Configure cloud storage environment variables
2. Restart the application
3. New uploads will go to cloud storage
4. Existing local files remain accessible

### From Cloud to Local
1. Set `USE_CLOUD_STORAGE=false`
2. Restart the application
3. New uploads will be stored locally
4. Cloud files remain accessible via their URLs

## Troubleshooting

### Common Issues

1. **Access Denied Error**
   - Check AWS credentials
   - Verify IAM permissions
   - Confirm bucket exists

2. **Upload Fails**
   - Check internet connection
   - Verify bucket region
   - Check file size limits

3. **CDN Issues**
   - Verify CloudFront configuration
   - Check cache invalidation
   - Confirm CORS settings

### Debug Mode

Enable debug logging:

```bash
DEBUG=cloud-storage,video-processor npm start
```

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use IAM roles** in production environments
3. **Enable bucket versioning** for data protection
4. **Set up bucket lifecycle policies** for cost optimization
5. **Use presigned URLs** for temporary access
6. **Enable CloudFront** for better performance and security
7. **Regular credential rotation**

## Cost Optimization

1. **Lifecycle Policies**: Auto-delete old files
2. **Intelligent Tiering**: Move infrequently accessed files
3. **CloudFront**: Reduce S3 requests
4. **Compression**: Use efficient video codecs
5. **Monitoring**: Track usage and costs

## Production Deployment

1. **Use environment-specific buckets**
2. **Enable access logging**
3. **Set up monitoring and alerts**
4. **Configure backup strategies**
5. **Implement security scanning**
6. **Use infrastructure as code** (Terraform/CloudFormation)
