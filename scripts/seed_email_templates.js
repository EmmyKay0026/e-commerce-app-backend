const { createClient } = require("@supabase/supabase-js");
require("dotenv").config(); // Loads from .env in CWD

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // MUST use Service Role for inserts if RLS is on

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const templates = [
    {
        name: "NEW_BIZZ_ACCOUNT_APPLICATION",
        subject: "New Vendor Application: {{vendor_name}}",
        html_content: `
      <html >
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f7f8fa; color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="/Assets/ind_logo(1).png" alt="IndustrialMart Logo"
                        style="width:10rem; height:5rem; object-fit:contain; display:inline-block; vertical-align:middle; margin-right:8px;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <h2 style="color:#0861c1; margin:0; font-size:18px; font-weight:700; display:inline-block;">IndustrialMart</h2>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 0 40px;">
                <hr style="border:none; border-top:1px solid #eeeeee; margin:0;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#333;">
                <h3 style="color:#0861c1; font-size:20px; margin-top:0;">New vendor application awaiting review</h3>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Hi Admin,
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  A new vendor application has been submitted and is ready for review.
                </p>

                <p style="font-size:15px; font-weight:bold; color:#0861c1; margin:16px 0;">
                  Applicant Details:
                </p>

                <ul style="font-size:15px; line-height:1.6; margin:16px 0 16px 20px; padding:0;">
                  <li style="margin-bottom:8px;">
                    <strong>Business Name:</strong> {{ business_name }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Contact Person:</strong> {{ contact_person }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Email:</strong> {{ email }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Phone:</strong> {{ phone_number }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Application Date:</strong> {{ application_date }}
                  </li>
                </ul>

                <!-- Call to Action Button -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                  <tr>
                    <td align="center" style="border-radius:4px; background-color:#0861c1;">
                      <a href="{{ review_application_url }}" target="_blank" 
                         style="display:inline-block; padding:12px 30px; font-size:15px; color:#ffffff; text-decoration:none; font-weight:bold;">
                        Review Application
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Log in to the admin dashboard to review the application and approve or reject the vendor.
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Best regards,<br />
                  <strong>The IndustrialMart System</strong>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

    `,
    },
    {
        name: "BIZZ_ACCOUNT_SUSPENSION",
        subject: "Important: Your Account has been Suspended",
        html_content: `
     <html>
   <body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f7f8fa; color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="/Assets/ind_logo(1).png" alt="IndustrialMart Logo"
                        style="width:10rem; height:5rem; object-fit:contain; display:inline-block; vertical-align:middle; margin-right:8px;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <h2 style="color:#0861c1; margin:0; font-size:18px; font-weight:700; display:inline-block;">IndustrialMart</h2>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 0 40px;">
                <hr style="border:none; border-top:1px solid #eeeeee; margin:0;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#333;">
                <h3 style="color:#0861c1; font-size:20px; margin-top:0;">Your IndustrialMart account has been suspended</h3>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Hi {{ vendor_name }},
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Your vendor account on <strong>IndustrialMart</strong> has been suspended.
                </p>

                <p style="font-size:15px; font-weight:bold; color:#0861c1; margin:16px 0;">
                  Reason for suspension:
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  {{ suspension_reason }}
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  While your account is suspended, your products are not visible to buyers and you cannot receive new orders.
                </p>

                <p style="font-size:15px; font-weight:bold; color:#0861c1; margin:16px 0;">
                  What you can do:
                </p>

                <ul style="font-size:15px; line-height:1.6; margin:16px 0 16px 20px; padding:0;">
                  <li>If you believe this suspension was made in error or would like to appeal, contact us at 
                    <a href="mailto:{{ vendor_support_email }}" style="color:#0861c1; text-decoration:none;">{{ vendor_support_email }}</a> 
                    within 7 days.
                  </li>
                </ul>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Best regards,<br />
                  <strong>IndustrialMart.</strong>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

    `,
    },
    {
        name: "NEW_PRODUCT_UPLOADED",
        subject: "New Product Alert: {{product_name}}",
        html_content: `
     <html>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f7f8fa; color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="/Assets/ind_logo(1).png" alt="IndustrialMart Logo"
                        style="width:10rem; height:5rem; object-fit:contain; display:inline-block; vertical-align:middle; margin-right:8px;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <h2 style="color:#0861c1; margin:0; font-size:18px; font-weight:700; display:inline-block;">IndustrialMart</h2>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 0 40px;">
                <hr style="border:none; border-top:1px solid #eeeeee; margin:0;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#333;">
                <h3 style="color:#0861c1; font-size:20px; margin-top:0;">New product submission requires approval</h3>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Hi Admin,
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  A vendor has submitted a new product for approval.
                </p>

                <p style="font-size:15px; font-weight:bold; color:#0861c1; margin:16px 0;">
                  Product Details:
                </p>

                <ul style="font-size:15px; line-height:1.6; margin:16px 0 16px 20px; padding:0;">
                  <li style="margin-bottom:8px;">
                    <strong>Product Name:</strong> {{ product_name }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Vendor:</strong> {{ vendor_business_name }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Category:</strong> {{ category }}
                  </li>
                  <li style="margin-bottom:8px;">
                    <strong>Submission Date:</strong> {{ submission_date }}
                  </li>
                </ul>

                <!-- Call to Action Button -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                  <tr>
                    <td align="center" style="border-radius:4px; background-color:#0861c1;">
                      <a href="{{ review_product_url }}" target="_blank" 
                         style="display:inline-block; padding:12px 30px; font-size:15px; color:#ffffff; text-decoration:none; font-weight:bold;">
                        Review Product
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Log in to the admin dashboard to review the product details and approve, reject, or request changes.
                </p>

                <p style="font-size:15px; line-height:1.6; margin:16px 0;">
                  Best regards,<br />
                  <strong>The IndustrialMart System.</strong>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

    `,
    },
];

async function seedTemplates() {
    console.log("Seeding email templates...");

    for (const t of templates) {
        const { data, error } = await supabase
            .from("email_templates")
            .upsert(t, { onConflict: "name" }) // Upsert based on 'name' unique key
            .select();

        if (error) {
            console.error(`Error inserting ${t.name}:`, error.message);
        } else {
            console.log(`Synced template: ${t.name}`);
        }
    }

    console.log("Done.");
}

seedTemplates();
