const eventEmitter = require("../events/eventEmitter");
const emailClient = require("./emailClient");
const { supabase } = require("../config/supabaseClient"); // Ensure you have this export

const frontendBaseUrl =
  process.env.FRONTEND_URL || "https://www.industrialmart.ng";
const supportEmail = process.env.SENDER_EMAIL;
const adminEmail = process.env.ADMIN_EMAIL || "info@industrialmart.ng"; // Default or Env

// Helper to get user details if not provided
async function getUserDetails(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data;
}

// 1. Vendor Application Received (Vendor + Admin)
eventEmitter.on("RECEIVED_BIZZ_ACCOUNT_APPLICATION", async (data) => {
  try {
    let email = data.email;
    let firstName = "Merchant";

    // Fetch proper user details if userId is present
    if (data.userId) {
      const user = await getUserDetails(data.userId);
      if (user) {
        if (!email) email = user.email;
        firstName = user.first_name || "Merchant";
      }
    } else if (data.first_name && data.first_name !== "undefined") {
      firstName = data.first_name;
    }

    // Email to Vendor
    await emailClient.sendEmail({
      to: email,
      templateName: "RECEIVED_BIZZ_ACCOUNT_APPLICATION",
      data: {
        first_name: firstName,
        support_email: supportEmail,
        frontend_base_url: frontendBaseUrl,
      },
    });

    // Email to Admin
    await emailClient.sendEmail({
      to: adminEmail,
      templateName: "NEW_BIZZ_ACCOUNT_APPLICATION",
      data: {
        vendor_name: data.first_name, // Or business name if available
        business_profile_id: data.businessProfileId,
        admin_dashboard_url: `${frontendBaseUrl}/admin/dashboard`,
      },
    });

  } catch (error) {
    console.error(`Failed to handle RECEIVED_BIZZ_ACCOUNT_APPLICATION:`, error);
  }
});

// 2. Business Account Approval
eventEmitter.on("BIZZ_ACCOUNT_APPROVAL", async (data) => {
  try {
    let email = data.email;
    let firstName = "Partner";

    if (data.owner_id) {
      const user = await getUserDetails(data.owner_id);
      if (user) {
        if (!email) email = user.email;
        firstName = user.first_name || "Partner";
      }
    }

    if (email) {
      await emailClient.sendEmail({
        to: email,
        templateName: "BIZZ_ACCOUNT_APPROVAL",
        data: {
          first_name: firstName,
          business_name: data.business_name || "Your Business",
          login_url: `${frontendBaseUrl}/login`,
          support_email: supportEmail,
        },
      });
    }
  } catch (error) {
    console.error("Failed to handle BIZZ_ACCOUNT_APPROVAL:", error);
  }
});

// 3. Business Account Suspension
eventEmitter.on("BIZZ_ACCOUNT_SUSPENSION", async (data) => {
  try {
    let email = data.email;
    let firstName = "Partner";

    if (data.owner_id) {
      const user = await getUserDetails(data.owner_id);
      if (user) {
        if (!email) email = user.email;
        firstName = user.first_name || "Partner";
      }
    }

    if (email) {
      await emailClient.sendEmail({
        to: email,
        templateName: "BIZZ_ACCOUNT_SUSPENSION",
        data: {
          vendor_name: firstName || businessName || "Partner",
          suspension_reason: data.reason || "Violation of terms",
          vendor_support_email: supportEmail,
        },
      });
    }
  } catch (error) {
    console.error("Failed to handle BIZZ_ACCOUNT_SUSPENSION:", error);
  }
});

// 4. New Product Uploaded (Admin Alert)
eventEmitter.on("NEW_PRODUCT_UPLOADED", async (data) => {
  try {
    await emailClient.sendEmail({
      to: adminEmail,
      templateName: "NEW_PRODUCT_UPLOADED", // Ensure this template exists
      data: {
        product_name: data.product_name,
        vendor_name: data.vendor_name,
        product_slug: data.slug,
        admin_url: `${frontendBaseUrl}/admin/products`,
      },
    });
  } catch (error) {
    console.error("Failed to handle NEW_PRODUCT_UPLOADED:", error);
  }
});


console.log("Notification Service initialized and listening for events...");

