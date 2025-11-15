const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const uuidv4 = require("uuid").v4;

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID; // New
const CLOUDFLARE_API_TOKEN_FOR_PURGE =
  process.env.CLOUDFLARE_API_TOKEN_FOR_PURGE; // New
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
// const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH; // Assuming this env var exists
const DELIVERY_URL_BASE = `https://r2-image-server.industrialmart0.workers.dev/`;
// const DELIVERY_URL_BASE = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/`;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function generateMultipleUploadUrls(files) {
  if (!files || !Array.isArray(files)) {
    return Promise.reject(
      new Error("Invalid input: 'files' must be an array.")
    );
  }
  const uploadPromises = files.map(async (file) => {
    const fileExtension = file.originalFileName.split(".").pop();
    const fileKey = `uploads/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: file.contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 1800,
    });

    return {
      presignedUrl,
      fileKey,
      originalFileName: file.originalFileName,
    };
  });

  return Promise.all(uploadPromises);
}

async function deleteR2Object(fileKey) {
  if (!fileKey) {
    throw new Error("fileKey is required to delete an object from R2.");
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
  // Attempt to purge Cloudflare CDN cache if configured
  if (
    DELIVERY_URL_BASE &&
    CLOUDFLARE_ZONE_ID &&
    CLOUDFLARE_API_TOKEN_FOR_PURGE
  ) {
    const urlToPurge = `${DELIVERY_URL_BASE}${fileKey}`;
    await purgeCloudflareCDN(urlToPurge);
  }
  return { success: true, message: `Object ${fileKey} deleted successfully.` };
}

async function purgeCloudflareCDN(urlToPurge) {
  if (!urlToPurge) {
    console.warn("No URL provided for Cloudflare CDN cache purge.");
    return;
  }

  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN_FOR_PURGE) {
    console.error("Cloudflare API credentials missing for CDN cache purge.");
    return;
  }

  const purgeApiUrl = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`;

  try {
    const response = await fetch(purgeApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN_FOR_PURGE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: [urlToPurge],
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.error(
        `Failed to purge Cloudflare CDN cache for ${urlToPurge}:`,
        data.errors
      );
    } else {
      console.log(
        `Cloudflare CDN cache purge initiated successfully for ${urlToPurge}.`
      );
    }
  } catch (error) {
    console.error(
      `Error purging Cloudflare CDN cache for ${urlToPurge}:`,
      error
    );
  }
}

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const generateUploadURL = async () => {
  const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`;

  const cfResponse = await fetch(cloudflareUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });

  return cfResponse;
};

module.exports = {
  generateUploadURL,
  generateMultipleUploadUrls,
  deleteR2Object,
  purgeCloudflareCDN,
};
