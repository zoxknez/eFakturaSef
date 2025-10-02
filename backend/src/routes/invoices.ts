import express from 'express';

const router = express.Router();

// @route   GET /api/invoices
// @desc    Get all invoices
// @access  Private
router.get('/', (req, res) => {
  const mockInvoices = [
    {
      id: '1',
      invoiceNumber: '2024-001',
      issueDate: '2024-10-01',
      totalAmount: 50000.00,
      status: 'sent',
      buyerName: 'Kompanija ABC d.o.o.'
    },
    {
      id: '2',
      invoiceNumber: '2024-002',
      issueDate: '2024-10-02',
      totalAmount: 75000.00,
      status: 'accepted',
      buyerName: 'Kompanija XYZ d.o.o.'
    }
  ];

  res.json({
    success: true,
    data: mockInvoices
  });
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const mockInvoice = {
    id,
    invoiceNumber: '2024-001',
    issueDate: '2024-10-01',
    totalAmount: 50000.00,
    subtotal: 41666.67,
    vatAmount: 8333.33,
    status: 'accepted',
    buyerName: 'Kompanija ABC d.o.o.',
    buyerPIB: '123456789',
    lines: [
      {
        id: '1',
        itemName: 'Usluga konsaltinga',
        quantity: 1,
        unitPrice: 41666.67,
        vatRate: 20,
        lineTotal: 50000.00
      }
    ]
  };

  res.json({
    success: true,
    data: mockInvoice
  });
});

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Mock creation response
    const newInvoice = {
      id: Date.now().toString(),
      ...invoiceData,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: newInvoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;