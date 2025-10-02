import express from 'express';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const router = express.Router();

// Mock user data - replace with actual database
const mockUser = {
  id: '1',
  email: 'admin@example.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpYNBhbeFH6Q8xe', // 'password'
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check if user exists (mock check)
    if (email !== mockUser.email) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, mockUser.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create token
    const payload = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;