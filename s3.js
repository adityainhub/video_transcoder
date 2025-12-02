const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3(bucket, key, localPath, contentType) {
  const fileContent = fs.readFileSync(localPath);
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileContent,
    ContentType: contentType
  }));
}

// New function: Upload entire directory (for HLS segments)
async function uploadDirectoryToS3(bucket, s3Prefix, localDir, contentType) {
  const files = fs.readdirSync(localDir);
  
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const s3Key = `${s3Prefix}/${file}`;
    
    // Determine content type
    let fileContentType = contentType;
    if (file.endsWith(".ts")) {
      fileContentType = "video/MP2T";
    } else if (file.endsWith(".m3u8")) {
      fileContentType = "application/vnd.apple.mpegurl";
    }
    
    console.log(`Uploading: ${s3Key}`);
    await uploadToS3(bucket, s3Key, localPath, fileContentType);
  }
}

async function downloadFromS3(bucket, key, destPath) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(destPath);
    response.Body.pipe(stream)
      .on("finish", resolve)
      .on("error", reject);
  });
}

module.exports = { uploadToS3, uploadDirectoryToS3, downloadFromS3 };