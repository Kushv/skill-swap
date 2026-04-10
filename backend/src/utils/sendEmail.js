import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'SkillSwap'} <${process.env.EMAIL_FROM || 'noreply@skillswap.com'}>`, // Sender address
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // Actually send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`Email sending failed:`, err);
  }
};

export default sendEmail;
