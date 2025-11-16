const axios = require("axios");

async function sendCompletion(callbackBaseUrl, videoId, outputs) {
  try {
    await axios.post(`${callbackBaseUrl}/${videoId}/complete`, {
      outputs: outputs.map((o) => o.s3Key),
    });
    console.log("Completion callback sent.");
  } catch (err) {
    console.error("Callback failed:", err);
  }
}

async function sendFailure(callbackBaseUrl, videoId) {
  try {
    await axios.post(`${callbackBaseUrl}/${videoId}/failed`);
    console.log("Failure callback sent.");
  } catch (err) {
    console.error("Failure callback error:", err);
  }
}

module.exports = { sendCompletion, sendFailure };