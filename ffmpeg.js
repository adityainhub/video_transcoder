// ffmpeg.js
const ffmpeg = require("fluent-ffmpeg");

const resolutions = [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "720p", width: 1280, height: 720 },
  { name: "480p", width: 854, height: 480 },
  { name: "360p", width: 640, height: 360 },
];

async function transcodeAll(inputPath, videoId) {
  const outputs = [];

  for (const r of resolutions) {
    const outputPath = `/tmp/${videoId}-${r.name}.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${r.width}x${r.height}`)
        .format("mp4")
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    outputs.push({
      name: r.name, // required for quality
      localPath: outputPath,
      s3Key: `processed-videos/${videoId}/${r.name}.mp4`,
      contentType: "video/mp4"
    });
  }

  // Thumbnail
  const thumbnailPath = `/tmp/${videoId}-thumb.jpg`;

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        count: 1,
        folder: "/tmp",
        filename: `${videoId}-thumb.jpg`,
      })
      .on("end", resolve)
      .on("error", reject);
  });

  outputs.push({
    name: "thumbnail",
    localPath: thumbnailPath,
    s3Key: `processed-videos/${videoId}/thumb.jpg`,
    contentType: "image/jpeg",
  });

  return outputs;
}

module.exports = { transcodeAll };