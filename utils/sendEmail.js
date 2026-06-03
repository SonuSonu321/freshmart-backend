const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
      return;
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: `"FreshMart" <${process.env.EMAIL_USER}>`,
      to, subject, html
    });
  } catch (err) {
    console.error('[Email Error]', err.message);
    // Don't throw — email failure should not break order placement
  }
};

module.exports = sendEmail;
