const path = require("path");
const { downloadFromS3, uploadToS3 } = require("./s3");
const { transcodeAll } = require("./ffmpeg");
const { sendCompletion, sendFailure } = require("./callback");

const RAW_BUCKET = process.env.S3_RAW_BUCKET;
const PROCESSED_BUCKET = process.env.S3_PROCESSED_BUCKET;
const RAW_VIDEO_KEY = process.env.S3_VIDEO_KEY;
const VIDEO_ID = process.env.VIDEO_ID;
const CALLBACK_URL = process.env.CALLBACK_URL;

async function run() {
  console.log("Transcoder starting for video:", VIDEO_ID);

  try {
    const inputPath = `/tmp/${VIDEO_ID}-input.mp4`;

    console.log("Downloading original video...");
    await downloadFromS3(RAW_BUCKET, RAW_VIDEO_KEY, inputPath);

    console.log("Starting transcoding...");
    const outputs = await transcodeAll(inputPath, VIDEO_ID);

    console.log("Uploading outputs...");
    for (const out of outputs) {
      await uploadToS3(PROCESSED_BUCKET, out.s3Key, out.localPath);
      console.log("Uploaded:", out.s3Key);
    }

    console.log("Sending completion callback...");
    await sendCompletion(CALLBACK_URL, VIDEO_ID, outputs);

    console.log("Transcoding COMPLETE.");
    process.exit(0);
  } catch (err) {
    console.error("TRANSCODING FAILED:", err);
    await sendFailure(CALLBACK_URL, VIDEO_ID);
    process.exit(1);
  }
}

run();