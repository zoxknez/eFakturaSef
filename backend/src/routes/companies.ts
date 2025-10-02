import express from 'express';

const router = express.Router();

// @route   GET /api/companies
// @desc    Get all companies
// @access  Private
router.get('/', (req, res) => {
  const mockCompanies = [
    {
      id: '1',
      name: 'Moja Kompanija d.o.o.',
      pib: '987654321',
      address: 'Bulevar Kralja Aleksandra 1',
      city: 'Beograd',
      postalCode: '11000'
    }
  ];

  res.json({
    success: true,
    data: mockCompanies
  });
});

export default router;