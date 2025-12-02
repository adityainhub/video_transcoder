const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const QUALITIES = [
  { name: "4K", width: 3840, height: 2160, bitrate: "15000k", audioBitrate: "384k" },
  { name: "1440p", width: 2560, height: 1440, bitrate: "8000k", audioBitrate: "256k" },
  { name: "1080p", width: 1920, height: 1080, bitrate: "5000k", audioBitrate: "192k" },
  { name: "720p", width: 1280, height: 720, bitrate: "2800k", audioBitrate: "128k" },
  { name: "480p", width: 854, height: 480, bitrate: "1400k", audioBitrate: "128k" },
  { name: "360p", width: 640, height: 360, bitrate: "800k", audioBitrate: "96k" }
];

async function transcodeAll(inputPath, videoId) {
  const outputDir = `/tmp/${videoId}`;
  fs.mkdirSync(outputDir, { recursive: true });

  const variants = [];

  // Generate HLS for each quality
  for (const quality of QUALITIES) {
    const qualityDir = `${outputDir}/${quality.name}`;
    fs.mkdirSync(qualityDir, { recursive: true });

    const playlistPath = `${qualityDir}/playlist.m3u8`;

    const command = `ffmpeg -i ${inputPath} \
      -vf "scale=${quality.width}:${quality.height}" \
      -c:v libx264 -preset fast -crf 22 \
      -b:v ${quality.bitrate} -maxrate ${quality.bitrate} -bufsize ${parseInt(quality.bitrate) * 2}k \
      -c:a aac -b:a ${quality.audioBitrate} \
      -hls_time 10 \
      -hls_list_size 0 \
      -hls_segment_filename "${qualityDir}/segment%03d.ts" \
      -f hls \
      ${playlistPath}`;

    console.log(`Transcoding ${quality.name} HLS...`);
    execSync(command, { stdio: "inherit" });

    variants.push({
      name: quality.name,
      localDir: qualityDir,
      s3Prefix: `processed-videos/${videoId}/hls/${quality.name}`,
      contentType: "application/vnd.apple.mpegurl"
    });
  }

  // Generate master playlist
  const masterPlaylist = generateMasterPlaylist(videoId, QUALITIES);
  const masterPath = `${outputDir}/master.m3u8`;
  fs.writeFileSync(masterPath, masterPlaylist);

  variants.push({
    name: "master",
    localPath: masterPath,
    s3Key: `processed-videos/${videoId}/hls/master.m3u8`,
    contentType: "application/vnd.apple.mpegurl"
  });

  // Generate thumbnail
  const thumbPath = `${outputDir}/thumb.jpg`;
  execSync(`ffmpeg -i ${inputPath} -ss 00:00:05 -vframes 1 -q:v 2 ${thumbPath}`);

  variants.push({
    name: "thumbnail",
    localPath: thumbPath,
    s3Key: `processed-videos/${videoId}/thumb.jpg`,
    contentType: "image/jpeg"
  });

  return variants;
}

function generateMasterPlaylist(videoId, qualities) {
  let playlist = "#EXTM3U\n#EXT-X-VERSION:3\n\n";

  for (const quality of qualities) {
    const bandwidth = parseInt(quality.bitrate) * 1000;
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.width}x${quality.height}\n`;
    playlist += `${quality.name}/playlist.m3u8\n\n`;
  }

  return playlist;
}

module.exports = { transcodeAll };