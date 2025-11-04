const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`;

router.post("/get-upload-url", async (req, res) => {
  try {
    // You can read optional metadata/signed URL flags from the request body if needed
    const metadata = JSON.stringify({ app: "next-ts-app" });

    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`;

    const cfResponse = await fetch(cloudflareUrl, {
      method: "POST",
      headers: {
        // IMPORTANT: Use the Bearer Token for secure authentication
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      // Note: Cloudflare's direct_upload endpoint can often take form-data or JSON,
      // but since we are not sending a file, a simple POST usually suffices.
      // If you need to include form-data (like metadata), use a proper form library.
      // For simplicity here, we assume the API handles an empty/simple body POST.
    });

    const data = await cfResponse.json();

    if (!data.success) {
      console.error("Cloudflare API Error:", data.errors);
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }

    // Pass the uploadURL and id directly to the frontend
    res.status(200).json(data.result);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
