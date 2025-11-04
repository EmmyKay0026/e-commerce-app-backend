const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const generateUploadURL = async () => {
  const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`;

  const cfResponse = await fetch(cloudflareUrl, {
    method: "POST",
    headers: {
      // IMPORTANT: Use the Bearer Token for secure authentication
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });

  return cfResponse;
};

module.exports = { generateUploadURL };