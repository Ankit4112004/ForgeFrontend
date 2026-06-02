import express from 'express';
import morgan from 'morgan';
import { sendEmail } from './email.js';
import channel from './mq.js';

const app = express();
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('Hello from Notification Service!');
});

app.get("/_status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/_status/readyz", (req, res) => {
    res.status(200).json({ status: "ready" });
});


channel.consume('auth_notification_queue', async (msg) => {

    if (msg !== null) {
        const messageContent = msg.content.toString();
        console.log('Received message from queue:', messageContent);

        try {
            const { userId, timestamp, email } = JSON.parse(messageContent);
            
            const dateStr = new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' });
            const subject = '🚨 Security Alert: New Login to Sandbox IDE';
            const text = `A new login was detected for your Sandbox IDE account at ${dateStr}. If this was not you, please secure your account immediately.`;
            const html = `
            <h3>Security Alert</h3>
            <p>Hello,</p>
            <p>We detected a new login to your <strong>Sandbox IDE</strong> account.</p>
            <ul>
                <li><strong>Time:</strong> <strong>${dateStr}</strong></li>
                <li><strong>Account:</strong> <a href="mailto:${email}">${email}</a></li>
            </ul>
            <p>If this was you, you can safely ignore this email.</p>
            <p><strong>If you did not authorize this login, please secure your account immediately.</strong></p>
            <br/>
            <p><small>Sandbox IDE &bull; Powered by AI</small></p>`;

            await sendEmail(email, subject, text, html);
            
            channel.ack(msg);
        } catch (error) {
            console.error('Error processing message:', error);
            // Optionally, you can choose to nack the message to requeue it
            // channel.nack(msg);
        }
    } else {
        console.log('Received null message');
    }
})



export default app;