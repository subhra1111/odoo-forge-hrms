const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  // Use configured Gmail if available
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    return transporter;
  }

  // Use configured SMTP host if available
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return transporter;
  }

  // Fallback: Create Ethereal test account for hackathon/development convenience
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log(`Nodemailer Ethereal Sandbox Configured. User: ${testAccount.user}`);
    return transporter;
  } catch (error) {
    console.error('Failed to configure Ethereal mail sandbox. Using local console-logger fallback.', error);
    // Safe console fallback
    transporter = {
      sendMail: async (options) => {
        console.log('\n--- EMAIL SENT (CONSOLE LOGGER FALLBACK) ---');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body:\n${options.text}`);
        console.log('-------------------------------------------\n');
        return { messageId: 'console-log-id' };
      }
    };
    return transporter;
  }
};

const sendVerificationEmail = async (email, name, token) => {
  const mailTransporter = await getTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: '"HRMS Portal" <no-reply@hrms.com>',
    to: email,
    subject: 'Verify Your Email - HRMS Portal',
    text: `Hello ${name},\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nThank you!`,
    html: `
      <h3>Hello ${name},</h3>
      <p>Please verify your email by clicking the button below:</p>
      <a href="${verifyUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">Verify Email</a>
      <p>Or copy and paste this link in your browser:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[Email Sent] Verification link: ${verifyUrl}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Ethereal Sandbox Inbox Preview URL]: ${previewUrl}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};

const sendActivationEmail = async (email, name, employeeId, tempPassword) => {
  const mailTransporter = await getTransporter();

  const mailOptions = {
    from: '"HRMS Portal" <no-reply@hrms.com>',
    to: email,
    subject: 'Welcome to the Team! Activate Your HRMS Account',
    text: `Hello ${name},\n\nYou have been registered on the HRMS portal.\nYour Employee ID is: ${employeeId}\nYour Temporary Password is: ${tempPassword}\n\nPlease log in and activate your account using these credentials.\n\nThank you!`,
    html: `
      <h3>Hello ${name},</h3>
      <p>Welcome to the team! You have been registered on the HRMS portal.</p>
      <p><strong>Employee ID:</strong> ${employeeId}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please log in and activate your account to configure your password.</p>
    `
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[Email Sent] Activation credentials for ${employeeId} sent to ${email}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Ethereal Sandbox Inbox Preview URL]: ${previewUrl}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending activation email:', error);
  }
};

module.exports = { sendVerificationEmail, sendActivationEmail };
