const nodemailer = require("nodemailer");
const keys = require("../config/keys");

const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Define mail options
  const mailOptions = {
    from: `Skill Swap <${keys.emailFrom}>`,
    to: options.to,
    subject: options.subject,
    text: options.text || undefined,
    html: options.html || undefined,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log(`Email sent: ${info.messageId}`);

  return info;
};

module.exports = sendEmail;
