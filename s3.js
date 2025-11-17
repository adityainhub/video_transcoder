// s3.js
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const fsp = require("fs/promises");

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function downloadFromS3(bucket, key, destPath) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(destPath);
    response.Body.pipe(stream)
      .on("finish", resolve)
      .on("error", reject);
  });
}

async function uploadToS3(bucket, key, filePath, contentType = "video/mp4") {
  const buffer = await fsp.readFile(filePath);
  return s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );
}

module.exports = { downloadFromS3, uploadToS3 };