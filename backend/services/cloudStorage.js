const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

class CloudStorageService {
  constructor() {
    // Configuration based on environment variables
    this.useCloudStorage = process.env.USE_CLOUD_STORAGE === 'true';
    this.storageProvider = process.env.CLOUD_STORAGE_PROVIDER || 'local'; // 'aws-s3', 'firebase', 'local'
    
    if (this.useCloudStorage && this.storageProvider === 'aws-s3') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucketName = process.env.AWS_S3_BUCKET_NAME;
      this.cdnUrl = process.env.AWS_CLOUDFRONT_URL;
    }
  }

  /**
   * Upload file to cloud storage
   */
  async uploadFile(localFilePath, cloudFileName, contentType = 'video/mp4') {
    if (!this.useCloudStorage || this.storageProvider === 'local') {
      // Return local file path for local storage
      return {
        url: `/uploads/${path.basename(localFilePath)}`,
        cloudPath: localFilePath,
        provider: 'local'
      };
    }

    if (this.storageProvider === 'aws-s3') {
      return await this.uploadToS3(localFilePath, cloudFileName, contentType);
    }

    throw new Error(`Unsupported storage provider: ${this.storageProvider}`);
  }

  /**
   * Upload file to AWS S3
   */
  async uploadToS3(localFilePath, cloudFileName, contentType) {
    try {
      const fileContent = fs.readFileSync(localFilePath);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cloudFileName,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read', // Make files publicly accessible
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'original-name': path.basename(localFilePath)
        }
      });

      const result = await this.s3Client.send(command);
      
      // Generate public URL
      const publicUrl = this.cdnUrl 
        ? `${this.cdnUrl}/${cloudFileName}`
        : `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${cloudFileName}`;

      return {
        url: publicUrl,
        cloudPath: cloudFileName,
        provider: 'aws-s3',
        etag: result.ETag,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for secure download
   */
  async generatePresignedUrl(cloudPath, expiresIn = 3600) {
    if (!this.useCloudStorage || this.storageProvider === 'local') {
      return cloudPath; // Return local path as-is
    }

    if (this.storageProvider === 'aws-s3') {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: cloudPath,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    }

    throw new Error(`Unsupported storage provider: ${this.storageProvider}`);
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(cloudPath) {
    if (!this.useCloudStorage || this.storageProvider === 'local') {
      // Delete local file
      if (fs.existsSync(cloudPath)) {
        fs.unlinkSync(cloudPath);
        return { success: true, provider: 'local' };
      }
      return { success: false, error: 'File not found', provider: 'local' };
    }

    if (this.storageProvider === 'aws-s3') {
      return await this.deleteFromS3(cloudPath);
    }

    throw new Error(`Unsupported storage provider: ${this.storageProvider}`);
  }

  /**
   * Delete file from AWS S3
   */
  async deleteFromS3(cloudPath) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: cloudPath,
      });

      await this.s3Client.send(command);
      
      return {
        success: true,
        provider: 'aws-s3',
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete from S3: ${error.message}`);
    }
  }

  /**
   * Check if file exists in cloud storage
   */
  async fileExists(cloudPath) {
    if (!this.useCloudStorage || this.storageProvider === 'local') {
      return fs.existsSync(cloudPath);
    }

    if (this.storageProvider === 'aws-s3') {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: cloudPath,
        });

        await this.s3Client.send(command);
        return true;
      } catch (error) {
        if (error.name === 'NotFound') {
          return false;
        }
        throw error;
      }
    }

    throw new Error(`Unsupported storage provider: ${this.storageProvider}`);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(cloudPath) {
    if (!this.useCloudStorage || this.storageProvider === 'local') {
      if (!fs.existsSync(cloudPath)) {
        throw new Error('File not found');
      }
      
      const stats = fs.statSync(cloudPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        provider: 'local'
      };
    }

    if (this.storageProvider === 'aws-s3') {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: cloudPath,
        });

        const result = await this.s3Client.send(command);
        
        return {
          size: result.ContentLength,
          lastModified: result.LastModified,
          contentType: result.ContentType,
          etag: result.ETag,
          metadata: result.Metadata,
          provider: 'aws-s3'
        };
      } catch (error) {
        console.error('S3 metadata error:', error);
        throw new Error(`Failed to get S3 metadata: ${error.message}`);
      }
    }

    throw new Error(`Unsupported storage provider: ${this.storageProvider}`);
  }

  /**
   * Upload and cleanup local file
   */
  async uploadAndCleanup(localFilePath, cloudFileName, contentType = 'video/mp4') {
    try {
      const uploadResult = await this.uploadFile(localFilePath, cloudFileName, contentType);
      
      // Only cleanup if uploaded to cloud storage successfully
      if (this.useCloudStorage && this.storageProvider !== 'local') {
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
          console.log('Local file cleaned up:', localFilePath);
        }
      }
      
      return uploadResult;
    } catch (error) {
      console.error('Upload and cleanup error:', error);
      throw error;
    }
  }
}

module.exports = CloudStorageService;
