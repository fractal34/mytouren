const nodemailer = require('nodemailer');

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'Outlook365'
    auth: {
        user: process.env.EMAIL_USER,    // Your email address
        pass: process.env.EMAIL_PASS     // Your email password or app-specific password
    }
});

async function sendEmail(to, subject, text, html) {
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address
        to: to,                       // List of recipients
        subject: subject,             // Subject line
        text: text,                   // Plain text body
        html: html                    // HTML body
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

module.exports = { sendEmail };