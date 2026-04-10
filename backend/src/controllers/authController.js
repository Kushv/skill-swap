import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide all fields');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Bypass OTP: Mark user as verified immediately
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: true
    });

    if (user) {
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(res, user._id);
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      user.lastActive = Date.now();
      await user.save();

      res.status(201).json({
        success: true,
        message: 'User registered.',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          onboardingComplete: user.onboardingComplete,
          accessToken,
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.isVerified) {
      res.status(400);
      throw new Error('User is already verified');
    }

    if (!user.otp || !user.otpExpiry || Date.now() > user.otpExpiry) {
      res.status(400);
      throw new Error('OTP expired or invalid');
    }

    const isMatch = await bcrypt.compare(otp, user.otp);

    if (!isMatch) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(res, user._id);
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        accessToken,
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(res, user._id);
      
      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      user.lastActive = Date.now();
      await user.save();

      res.status(200).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          onboardingComplete: user.onboardingComplete,
          accessToken,
        }
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get new access token
// @route   POST /api/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401);
      throw new Error('Not authorized, no refresh token');
    }

    // Verify token structure
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken) {
      res.status(401);
      throw new Error('Not authorized, invalid user or token');
    }

    // Verify the hashed token in DB
    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
       res.status(401);
       throw new Error('Not authorized, token mismatch');
    }
    
    // Issue new access token
    const accessToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    res.cookie('refreshToken', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken -otp -otpExpiry');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
     const { email } = req.body;
     const user = await User.findOne({ email });

     if (!user) {
         res.status(404);
         throw new Error('User not found');
     }

     const resetToken = jwt.sign({ id: user._id }, process.env.RESET_TOKEN_SECRET, { expiresIn: process.env.RESET_TOKEN_EXPIRY || '1h' });
     
     const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

     await sendEmail({
       email: user.email,
       subject: 'SkillSwap Password Reset',
       message: `<p>You requested a password reset.</p><p>Click this <a href="${resetUrl}">link</a> to reset your password.</p>`
     });

     res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
      next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        
        const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(404);
            throw new Error('Invalid token or user not found');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(400);
        next(new Error('Invalid or expired token'));
    }
}

export {
  signup,
  verifyOtp,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword
};
