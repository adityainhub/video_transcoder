// callback.js
const axios = require("axios");
const crypto = require("crypto");

const ECS_SECRET = process.env.ECS_CALLBACK_SECRET;

function signPayload(body, timestamp) {
  const payload = `${timestamp}.${body}`;
  return crypto.createHmac("sha256", ECS_SECRET).update(payload).digest("hex");
}

async function sendProcessing(callbackBaseUrl, videoId) {
  console.log("=== Sending Processing Status ===");
  console.log("CALLBACK_BASE_URL =", callbackBaseUrl);
  console.log("Video ID:", videoId);
  console.log("URL:", `${callbackBaseUrl}/${videoId}/processing`);
  
  const bodyObj = {}; // Empty object
  const body = JSON.stringify(bodyObj); 
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp);

  console.log("Body:", body);
  console.log("Timestamp:", timestamp);
  console.log("Signature:", signature);

  try {
    const response = await axios.post(`${callbackBaseUrl}/${videoId}/processing`, bodyObj, {
      headers: {
        "Content-Type": "application/json",
        "X-ECS-Signature": signature,
        "X-ECS-Timestamp": timestamp,
      }
    });

    console.log("=== Processing Status SUCCESS ===");
    console.log("Status:", response.status);
  } catch (err) {
    console.error("=== Processing Status FAILED ===");
    console.error("Status:", err.response?.status);
    console.error("Status Text:", err.response?.statusText);
    console.error("Response Data:", JSON.stringify(err.response?.data));
    console.error("Error Message:", err.message);
  }
}

async function sendCompletion(callbackBaseUrl, videoId, variants) {
  console.log("=== Sending Completion Status ===");
  console.log("CALLBACK_BASE_URL =", callbackBaseUrl);
  console.log("Video ID (raw):", videoId);
  console.log("Video ID (type):", typeof videoId);
  
  // FIX: Parse videoId correctly - it might be a string like "test123" or "123"
  let numericVideoId;
  if (typeof videoId === 'string' && !isNaN(videoId)) {
    // If it's a numeric string like "123"
    numericVideoId = Number(videoId);
  } else if (typeof videoId === 'number') {
    // If it's already a number
    numericVideoId = videoId;
  } else {
    // If it's a non-numeric string like "test123", keep as null or handle error
    console.error("WARNING: videoId is not numeric:", videoId);
    numericVideoId = null;
  }
  
  console.log("Video ID (numeric):", numericVideoId);
  
  const bodyObj = {
    videoId: numericVideoId,
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

  console.log("URL:", `${callbackBaseUrl}/${videoId}/completed`);
  console.log("Body:", body);
  console.log("Timestamp:", timestamp);
  console.log("Signature:", signature);

  try {
    const response = await axios.post(`${callbackBaseUrl}/${videoId}/completed`, bodyObj, {
      headers: {
        "Content-Type": "application/json",
        "X-ECS-Signature": signature,
        "X-ECS-Timestamp": timestamp,
      }
    });

    console.log("=== Callback SUCCESS ===");
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(response.data));
  } catch (err) {
    console.error("=== Callback FAILED ===");
    console.error("Status:", err.response?.status);
    console.error("Status Text:", err.response?.statusText);
    console.error("Response Data:", JSON.stringify(err.response?.data));
    console.error("Response Headers:", JSON.stringify(err.response?.headers));
    console.error("Error Message:", err.message);
    
    if (err.response?.data) {
      console.error("Detailed Error:", err.response.data);
    }
  }
}

async function sendFailure(callbackBaseUrl, videoId) {
  console.log("=== Sending Failure Status ===");
  console.log("CALLBACK_BASE_URL =", callbackBaseUrl);
  
  const body = "";
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp);

  console.log("URL:", `${callbackBaseUrl}/${videoId}/failed`);
  console.log("Timestamp:", timestamp);
  console.log("Signature:", signature);

  try {
    const response = await axios.post(`${callbackBaseUrl}/${videoId}/failed`, {}, {
      headers: {
        "X-ECS-Signature": signature,
        "X-ECS-Timestamp": timestamp,
      }
    });

    console.log("=== Failure Callback SUCCESS ===");
    console.log("Status:", response.status);
  } catch (err) {
    console.error("=== Failure Callback FAILED ===");
    console.error("Status:", err.response?.status);
    console.error("Status Text:", err.response?.statusText);
    console.error("Response Data:", JSON.stringify(err.response?.data));
    console.error("Error Message:", err.message);
  }
}

module.exports = { sendProcessing, sendCompletion, sendFailure };