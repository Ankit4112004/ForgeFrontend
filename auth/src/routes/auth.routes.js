import { Router } from "express";
import User from "../models/user.model.js";
import passport from "passport";
import { sendAuthNotification } from "../config/mq.js";
import jwt from "jsonwebtoken";

const router = Router();

// Send the auth cookie over HTTPS only when the app itself is served over HTTPS
const SECURE_COOKIES = (process.env.FRONTEND_ORIGIN || '').startsWith('https://');


router.get('/google', passport.authenticate('google', {
    session: false,
    scope: [ 'profile', 'email' ]
}));

router.get('/google/callback', passport.authenticate('google', {
    session: false,
    failureRedirect: '/'
}), async (req, res) => {
    try {
        const { id, displayName, emails, photos } = req.user;
        let user = await User.findOne({ googleId: id });



        if (!user) {
            user = new User({
                googleId: id,
                email: emails[ 0 ].value,
                name: displayName,
                avatar: photos[ 0 ].value
            });
            await user.save();
        }

        await sendAuthNotification({
            userId: user._id,
            action: 'google_login',
            timestamp: new Date(),
            email: emails[ 0 ].value
        })

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set token in cookie
        res.cookie('token', token, {
            httpOnly: true,           // JS can't read it — XSS protection
            secure: SECURE_COOKIES,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });
        res.redirect(process.env.FRONTEND_ORIGIN || 'http://localhost:5173'); // Redirect to your frontend after successful login
    } catch (err) {
        console.error('Error during Google authentication:', err);
        res.redirect('/'); // Redirect to your frontend on error
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('name email avatar');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ name: user.name, email: user.email, avatar: user.avatar });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: SECURE_COOKIES,
        sameSite: 'lax',
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;