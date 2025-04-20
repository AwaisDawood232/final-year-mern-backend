const keys = require("../config/keys");

exports.verificationEmailTemplate = (name, verificationUrl) => {
  return {
    subject: "SkillSwap - Verify Your Email Address",
    html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #374151; background-color: #f9fafb;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;">
          <tr>
            <td align="center" valign="top" style="padding: 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td align="center" valign="top" style="background-image: linear-gradient(to right, #f97316, #ea580c); padding: 30px 20px; color: #ffffff; text-align: center;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" valign="top">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" valign="middle" style="background-color: #ffffff; color: #f97316; font-weight: bold; font-size: 14px; padding: 4px 6px; border-radius: 6px; margin-right: 8px;">
                                SK
                              </td>
                              <td align="center" valign="middle" style="padding-left: 8px;">
                                <span style="font-size: 24px; font-weight: 600;">SkillSwap</span>
                              </td>
                            </tr>
                          </table>
                          <p style="margin-top: 10px; margin-bottom: 0; opacity: 0.9;">Exchange Skills, Grow Together</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td align="center" valign="top" style="padding: 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" valign="top">
                          <p style="margin: 16px 0;">Hello ${name},</p>
                          
                          <p style="margin: 16px 0;">Thank you for registering with SkillSwap! To complete your registration and start exchanging skills with our community, please verify your email address:</p>
                        </td>
                      </tr>
                      
                      <!-- Button -->
                      <tr>
                        <td align="center" valign="top" style="padding: 30px 0;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" bgcolor="#f97316" style="border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: 600;">
                                  Verify Email Address
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td align="left" valign="top">
                          <p style="margin: 16px 0;">If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
                          
                          <p style="font-family: monospace; background-color: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px; color: #4b5563; margin: 20px 0; word-break: break-all;">
                            ${verificationUrl}
                          </p>
                          
                          <p style="margin: 16px 0;">If you did not sign up for a SkillSwap account, you can safely ignore this email.</p>
                        </td>
                      </tr>
                      
                      <!-- Divider -->
                      <tr>
                        <td align="center" valign="top" style="padding: 20px 0;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="height: 1px; width: 100%; background-color: #e5e7eb;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Signature -->
                      <tr>
                        <td align="left" valign="top">
                          <p style="margin-bottom: 0;">
                            Best regards,<br>The SkillSwap Team
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" valign="top" style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                    <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} SkillSwap. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
};

exports.resetPasswordTemplate = (name, resetUrl) => {
  return {
    subject: "SkillSwap - Reset Your Password",
    html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #374151; background-color: #f9fafb;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;">
          <tr>
            <td align="center" valign="top" style="padding: 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td align="center" valign="top" style="background-image: linear-gradient(to right, #f97316, #ea580c); padding: 30px 20px; color: #ffffff; text-align: center;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" valign="top">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" valign="middle" style="background-color: #ffffff; color: #f97316; font-weight: bold; font-size: 14px; padding: 4px 6px; border-radius: 6px; margin-right: 8px;">
                                SK
                              </td>
                              <td align="center" valign="middle" style="padding-left: 8px;">
                                <span style="font-size: 24px; font-weight: 600;">SkillSwap</span>
                              </td>
                            </tr>
                          </table>
                          <p style="margin-top: 10px; margin-bottom: 0; opacity: 0.9;">Exchange Skills, Grow Together</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td align="center" valign="top" style="padding: 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" valign="top">
                          <p style="margin: 16px 0;">Hello ${name},</p>
                          
                          <p style="margin: 16px 0;">You are receiving this email because a password reset was requested for your SkillSwap account. To set a new password, please click the button below:</p>
                        </td>
                      </tr>
                      
                      <!-- Button -->
                      <tr>
                        <td align="center" valign="top" style="padding: 30px 0;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" bgcolor="#f97316" style="border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: 600;">
                                  Reset Password
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td align="left" valign="top">
                          <p style="margin: 16px 0;">If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
                          
                          <p style="font-family: monospace; background-color: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px; color: #4b5563; margin: 20px 0; word-break: break-all;">
                            ${resetUrl}
                          </p>
                          
                          <!-- Warning Box -->
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                            <tr>
                              <td align="left" valign="top">
                                <p style="margin: 0; color: #9a3412; font-size: 14px;">
                                  <strong>Important:</strong> This password reset link will expire in 10 minutes for security reasons.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 16px 0;">If you did not request a password reset, please ignore this email or contact our support team if you have concerns about your account security.</p>
                        </td>
                      </tr>
                      
                      <!-- Divider -->
                      <tr>
                        <td align="center" valign="top" style="padding: 20px 0;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="height: 1px; width: 100%; background-color: #e5e7eb;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Signature -->
                      <tr>
                        <td align="left" valign="top">
                          <p style="margin-bottom: 0;">
                            Best regards,<br>The SkillSwap Team
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" valign="top" style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                    <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} SkillSwap. All rights reserved.</p>
                   
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
};
