import express from 'express';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', (_req, res) => {
  const mockUsers = [
    {
      id: '1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true
    }
  ];

  res.json({
    success: true,
    data: mockUsers
  });
});

export default router;