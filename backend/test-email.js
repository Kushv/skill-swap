import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log('✅ Transporter connected successfully');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,   // sends to yourself
      subject: 'SkillSwap OTP Test',
      text: 'Your test OTP is: 123456',
      html: '<p>Your test OTP is: <b>123456</b></p>',
    });

    console.log('✅ Email sent:', info.messageId);
  } catch (err) {
    console.error('❌ Email error:', err.message);
    console.error('Full error:', err);
  }
}

testEmail();
