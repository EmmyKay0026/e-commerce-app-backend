const eventEmitter = require("../events/eventEmitter");
const emailClient = require("./emailClient");

const frontendBaseUrl =
  process.env.FRONTEND_URL || "https://www.industrialmart.ng";
const supportEmail = process.env.SENDER_EMAIL;

eventEmitter.on("RECEIVED_BIZZ_ACCOUNT_APPLICATION", async (data) => {
  // console.log(
  //   "Event received: RECEIVED_BIZZ_ACCOUNT_APPLICATION for:",
  //   data.email
  // );

  try {
    // console.log("will attempt sending email now...");

    await emailClient.sendEmail({
      to: data.email,
      templateName: "RECEIVED_BIZZ_ACCOUNT_APPLICATION", // Corresponds to a template file
      data: {
        first_name: data.first_name || data.last_name || "User",
        support_email: supportEmail,
        message: "Your business account application has been approved.",
        frontend_base_url: frontendBaseUrl,
      },
    });
    // console.log(`Welcome email sent successfully to ${data.email}`);
  } catch (error) {
    console.error(`Failed to send welcome email to ${data.email}:`, error);
    // Here, you might also want to log this failure to a database
    // or trigger an alert for monitoring purposes.
  }
  // Logging to the database will be implemented in a later step (Step 12)
});

console.log("Notification Service initialized and listening for events...");

// Export nothing, just run the file to start the listeners
// module.exports = {};
