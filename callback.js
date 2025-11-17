// callback.js
const axios = require("axios");
const crypto = require("crypto");

const ECS_SECRET = process.env.ECS_CALLBACK_SECRET;   // SAME secret used in Spring Boot validator

function signPayload(body, timestamp) {
  const payload = `${timestamp}.${body}`;
  return crypto.createHmac("sha256", ECS_SECRET).update(payload).digest("hex");
}

async function sendCompletion(callbackBaseUrl, videoId, variants) {
  const bodyObj = {
    videoId: Number(videoId),
    variants: variants.map((v) => ({
      quality: v.name,
      s3Key: v.s3Key,
      url: `https://${process.env.S3_PROCESSED_BUCKET}.s3.amazonaws.com/${v.s3Key}`,
      contentType: v.contentType || "video/mp4"
    }))
  };

  const body = JSON.stringify(bodyObj);
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp);

  try {
    await axios.post(`${callbackBaseUrl}/${videoId}/completed`, bodyObj, {
      headers: {
        "Content-Type": "application/json",
        "X-ECS-Signature": signature,
        "X-ECS-Timestamp": timestamp,
      }
    });

    console.log("Completion callback sent.");
  } catch (err) {
    console.error("Completion callback FAILED:", err.response?.data || err.message);
  }
}

async function sendFailure(callbackBaseUrl, videoId) {
  const body = "";
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp);

  try {
    await axios.post(`${callbackBaseUrl}/${videoId}/failed`, {}, {
      headers: {
        "X-ECS-Signature": signature,
        "X-ECS-Timestamp": timestamp,
      }
    });

    console.log("Failure callback sent.");
  } catch (err) {
    console.error("Failure callback FAILED:", err.response?.data || err.message);
  }
}

module.exports = { sendCompletion, sendFailure };