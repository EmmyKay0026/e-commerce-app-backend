const { supabaseAnon: supabase } = require("../config/supabaseClient");
const nodemailer = require("nodemailer");
const Handlebars = require("handlebars");
require("dotenv").config();

// Configure the Nodemailer transporter for ZeptoMail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // Use TLS (Port 587)
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});
//
// /**
//  * Fetches the template content and compiles it with user data.
//  * @param {string} templateName - The name (key) of the template in the DB.
//  * @param {object} data - The user-specific data to inject (e.g., { fullName, email, token }).
//  */
// const fetchAndCompileTemplate = async (templateName, data) => {
//   // console.log("Is fetching and compiling details");

//   try {
//     // 1. Fetch template from Supabase
//     const { data: templateData, error } = await supabase
//       .from("email_templates")
//       .select("html_content, subject")
//       .eq("name", templateName)
//       .single();

//     if (error || !templateData) {
//       console.error(
//         `Error fetching email template '${templateName}'. Please ensure the 'email_templates' table exists and contains a template with this name.`,
//         error
//       );
//       return null; // Return null to indicate failure
//     }
//     console.log("Template data fetched successfully:", templateData);

//     // 2. Compile and render the template using Handlebars
//     const template = Handlebars.compile(templateData.html_content);
//     const subjectTemplate = Handlebars.compile(templateData.subject);
//     console.log("Template compiled successfully");

//     const htmlContent = template(data.html_content);
//     const subject = subjectTemplate(data.subject);
//     console.log("Template rendered successfully");
//     return { htmlContent, subject };
//   } catch (error) {
//     console.error("Database or compilation error:", error);
//     return null;
//   }
// };

/**
 * Fetches the template content and compiles it with user data.
 * @param {string} templateName - The name (key) of the template in the DB.
 * @param {object} data - The user-specific data to inject (e.g., { first_name, support_email, ... }).
 */
const fetchAndCompileTemplate = async (templateName, data) => {
  // console.log("Is fetching and compiling details");

  try {
    // 1. Fetch template from Supabase
    const { data: templateData, error } = await supabase
      .from("email_templates")
      .select("html_content, subject")
      .eq("name", templateName)
      .single();

    if (error || !templateData) {
      console.error(
        `Error fetching email template '${templateName}'. Please ensure the 'email_templates' table exists and contains a template with this name.`,
        error
      );
      return null;
    } // 2. Compile and render the template using Handlebars
    // console.log("template:", templateData);

    const template = Handlebars.compile(templateData.html_content);
    const subjectTemplate = Handlebars.compile(templateData.subject); // --- 🌟 FIX IS HERE 🌟 --- // Pass the entire 'data' object (which contains first_name, support_email, etc.) // to the compiled Handlebars templates.

    const htmlContent = template(data);
    const subject = subjectTemplate(data);

    // console.log("Template rendered successfully");
    // console.log("html_content:", htmlContent);
    // console.log("subject:", subject);

    return { htmlContent, subject };
  } catch (error) {
    console.error("Database or compilation error:", error);
    return null;
  }
};

const emailClient = {
  sendEmail: async ({ to, templateName, data }) => {
    // console.log("has gotten to emailClient");

    let { htmlContent, subject } = await fetchAndCompileTemplate(
      templateName,
      data
    );
    let mailOptions;
    // console.log("html_content:", htmlContent);
    // console.log("subject:", subject);

    if (htmlContent) {
      mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: to,
        subject: subject,
        html: htmlContent,
      };
    } else {
      // Fallback to plain text email
      console.warn(
        `Template '${templateName}' not found. Sending plain text fallback.`
      );
      const textContent = `Dear ${
        data.first_name || "User"
      },\n\nThis is a notification from our service.\n\n${data.message || ""}`;
      mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: to,
        subject: subject,
        text: textContent, // Use 'text' for plain text emails
      };
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      // console.log("Email sent successfully: %s", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending email via ZeptoMail:", error);
      return { success: false, error: error.message };
    }
  },
};

module.exports = emailClient;
