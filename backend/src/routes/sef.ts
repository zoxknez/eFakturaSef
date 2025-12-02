/**
 * SEF Routes - Serbian Electronic Invoice System API routes
 * Complete implementation based on official SEF API documentation
 */

import express from 'express';
import { SEFController } from '../controllers/sefController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SEF
 *   description: SEF Integration endpoints
 */

// =====================================================
// UTILITY ENDPOINTS
// =====================================================

/** GET /api/sef/unit-measures - Get list of unit measures */
router.get('/unit-measures', authMiddleware, asyncHandler(SEFController.getUnitMeasures));

/** GET /api/sef/vat-exemption-reasons - Get VAT exemption reasons */
router.get('/vat-exemption-reasons', authMiddleware, asyncHandler(SEFController.getVatExemptionReasons));

/** GET /api/sef/version - Get SEF API version */
router.get('/version', authMiddleware, asyncHandler(SEFController.getVersion));

/** GET /api/sef/health - SEF health check with night pause status */
router.get('/health', authMiddleware, asyncHandler(SEFController.healthCheck));

// =====================================================
// SALES INVOICE ENDPOINTS
// =====================================================

/**
 * @swagger
 * /api/sef/sales-invoice/send:
 *   post:
 *     summary: Send invoice to SEF (UBL format)
 *     tags: [SEF]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId]
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 format: uuid
 *               sendToCir:
 *                 type: string
 *                 enum: [Yes, No]
 *               executeValidation:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 */
router.post('/sales-invoice/send', authMiddleware, asyncHandler(SEFController.sendSalesInvoice));

/** GET /api/sef/sales-invoice/:invoiceId - Get sales invoice details */
router.get('/sales-invoice/:invoiceId', authMiddleware, asyncHandler(SEFController.getSalesInvoice));

/** DELETE /api/sef/sales-invoice/:invoiceId - Delete sales invoice from SEF */
router.delete('/sales-invoice/:invoiceId', authMiddleware, asyncHandler(SEFController.deleteSalesInvoice));

/**
 * @swagger
 * /api/sef/sales-invoice/cancel:
 *   post:
 *     summary: Cancel (request cancellation) of invoice on SEF
 *     tags: [SEF]
 */
router.post('/sales-invoice/cancel', authMiddleware, asyncHandler(SEFController.cancelSalesInvoice));

/**
 * @swagger
 * /api/sef/sales-invoice/storno:
 *   post:
 *     summary: Create storno invoice
 *     tags: [SEF]
 */
router.post('/sales-invoice/storno', authMiddleware, asyncHandler(SEFController.stornoSalesInvoice));

/** GET /api/sef/sales-invoice/:invoiceId/xml - Download invoice UBL XML */
router.get('/sales-invoice/:invoiceId/xml', authMiddleware, asyncHandler(SEFController.getSalesInvoiceXml));

/** GET /api/sef/sales-invoice/:invoiceId/pdf - Download invoice PDF */
router.get('/sales-invoice/:invoiceId/pdf', authMiddleware, asyncHandler(SEFController.getSalesInvoicePdf));

/** GET /api/sef/sales-invoice/:invoiceId/signature - Download invoice signature */
router.get('/sales-invoice/:invoiceId/signature', authMiddleware, asyncHandler(SEFController.getSalesInvoiceSignature));

/** GET /api/sef/sales-invoice/changes - Get invoice changes for a date */
router.get('/sales-invoice/changes', authMiddleware, asyncHandler(SEFController.getSalesInvoiceChanges));

/** GET /api/sef/sales-invoice/ids - Get invoice IDs by criteria */
router.get('/sales-invoice/ids', authMiddleware, asyncHandler(SEFController.getSalesInvoiceIds));

// =====================================================
// PURCHASE INVOICE ENDPOINTS
// =====================================================

/** GET /api/sef/purchase-invoice/:invoiceId - Get purchase invoice details */
router.get('/purchase-invoice/:invoiceId', authMiddleware, asyncHandler(SEFController.getPurchaseInvoice));

/**
 * @swagger
 * /api/sef/purchase-invoice/accept:
 *   post:
 *     summary: Accept a purchase invoice
 *     tags: [SEF]
 */
router.post('/purchase-invoice/accept', authMiddleware, asyncHandler(SEFController.acceptPurchaseInvoice));

/**
 * @swagger
 * /api/sef/purchase-invoice/reject:
 *   post:
 *     summary: Reject a purchase invoice
 *     tags: [SEF]
 */
router.post('/purchase-invoice/reject', authMiddleware, asyncHandler(SEFController.rejectPurchaseInvoice));

/** GET /api/sef/purchase-invoice/:invoiceId/xml - Download purchase invoice XML */
router.get('/purchase-invoice/:invoiceId/xml', authMiddleware, asyncHandler(SEFController.getPurchaseInvoiceXml));

/** GET /api/sef/purchase-invoice/:invoiceId/pdf - Download purchase invoice PDF */
router.get('/purchase-invoice/:invoiceId/pdf', authMiddleware, asyncHandler(SEFController.getPurchaseInvoicePdf));

/** GET /api/sef/purchase-invoice/changes - Get purchase invoice changes */
router.get('/purchase-invoice/changes', authMiddleware, asyncHandler(SEFController.getPurchaseInvoiceChanges));

// =====================================================
// VAT RECORDING ENDPOINTS (Zbirna i Pojedinačna evidencija PDV)
// =====================================================

/** GET /api/sef/vat-recording/group - Get group VAT recordings */
router.get('/vat-recording/group', authMiddleware, asyncHandler(SEFController.getGroupVatRecordings));

/** POST /api/sef/vat-recording/group - Create group VAT recording */
router.post('/vat-recording/group', authMiddleware, asyncHandler(SEFController.createGroupVatRecording));

/** GET /api/sef/vat-recording/group/:id - Get specific group VAT recording */
router.get('/vat-recording/group/:id', authMiddleware, asyncHandler(SEFController.getGroupVatRecording));

/** POST /api/sef/vat-recording/group/:id/cancel - Cancel group VAT recording */
router.post('/vat-recording/group/:id/cancel', authMiddleware, asyncHandler(SEFController.cancelGroupVatRecording));

/** GET /api/sef/vat-recording/individual - Get individual VAT recordings */
router.get('/vat-recording/individual', authMiddleware, asyncHandler(SEFController.getIndividualVatRecordings));

/** POST /api/sef/vat-recording/individual - Create individual VAT recording */
router.post('/vat-recording/individual', authMiddleware, asyncHandler(SEFController.createIndividualVatRecording));

/** GET /api/sef/vat-recording/individual/:id - Get specific individual VAT recording */
router.get('/vat-recording/individual/:id', authMiddleware, asyncHandler(SEFController.getIndividualVatRecording));

/** POST /api/sef/vat-recording/individual/:id/cancel - Cancel individual VAT recording */
router.post('/vat-recording/individual/:id/cancel', authMiddleware, asyncHandler(SEFController.cancelIndividualVatRecording));

// =====================================================
// EPP ENDPOINTS (Evidencija Prethodnog Poreza - VAT Deduction)
// =====================================================

/** POST /api/sef/vat-deduction - Create VAT deduction record */
router.post('/vat-deduction', authMiddleware, asyncHandler(SEFController.createVatDeductionRecord));

/** GET /api/sef/vat-deduction/:id - Get VAT deduction record */
router.get('/vat-deduction/:id', authMiddleware, asyncHandler(SEFController.getVatDeductionRecord));

/** PUT /api/sef/vat-deduction/:id - Correct VAT deduction record */
router.put('/vat-deduction/:id', authMiddleware, asyncHandler(SEFController.correctVatDeductionRecord));

/** DELETE /api/sef/vat-deduction/:id - Delete VAT deduction record */
router.delete('/vat-deduction/:id', authMiddleware, asyncHandler(SEFController.deleteVatDeductionRecord));

/** GET /api/sef/vat-deduction/system-calculation - Get system-calculated VAT */
router.get('/vat-deduction/system-calculation', authMiddleware, asyncHandler(SEFController.getSystemVatCalculation));

/** GET /api/sef/vat-deduction/:id/analytics - Download analytics CSV */
router.get('/vat-deduction/:id/analytics', authMiddleware, asyncHandler(SEFController.getVatDeductionAnalytics));

// =====================================================
// COMPANY ENDPOINTS
// =====================================================

/** GET /api/sef/company/check - Check if company exists in SEF */
router.get('/company/check', authMiddleware, asyncHandler(SEFController.checkCompanyExists));

/** POST /api/sef/company/refresh - Refresh company data from SEF */
router.post('/company/refresh', authMiddleware, asyncHandler(SEFController.refreshCompanyData));

// =====================================================
// NOTIFICATION ENDPOINTS
// =====================================================

/** POST /api/sef/notifications/subscribe - Subscribe to SEF notifications */
router.post('/notifications/subscribe', authMiddleware, asyncHandler(SEFController.subscribeNotifications));

/** DELETE /api/sef/notifications/unsubscribe - Unsubscribe from SEF notifications */
router.delete('/notifications/unsubscribe', authMiddleware, asyncHandler(SEFController.unsubscribeNotifications));

// =====================================================
// CIR ENDPOINTS (Central Invoice Registry)
// =====================================================

/** POST /api/sef/cir/assign - Assign invoice to CIR */
router.post('/cir/assign', authMiddleware, asyncHandler(SEFController.assignToCir));

/** POST /api/sef/cir/cancel-assign - Cancel CIR assignment */
router.post('/cir/cancel-assign', authMiddleware, asyncHandler(SEFController.cancelCirAssignment));

/** GET /api/sef/cir/history/:cirInvoiceId - Get CIR history */
router.get('/cir/history/:cirInvoiceId', authMiddleware, asyncHandler(SEFController.getCirHistory));

// =====================================================
// CUSTOMS DECLARATIONS ENDPOINTS
// =====================================================

/** GET /api/sef/customs-declarations - Get customs declarations */
router.get('/customs-declarations', authMiddleware, asyncHandler(SEFController.getCustomsDeclarations));

/** GET /api/sef/customs-declarations/:id - Get specific customs declaration */
router.get('/customs-declarations/:id', authMiddleware, asyncHandler(SEFController.getCustomsDeclaration));

export default router;
