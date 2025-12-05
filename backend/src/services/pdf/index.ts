/**
 * PDF Services Index
 * 
 * Centralized exports for all PDF generation services.
 * 
 * Usage:
 * - PDFGenerator: Static class for generating invoice PDFs with modern design
 * - pdfService: Instance for PPPDV, generic reports, and legacy invoice PDFs
 * 
 * Both services handle the same type of output (Buffer) but have different APIs.
 * Use PDFGenerator for new code, pdfService for compatibility with existing code.
 */

// Modern static generator (preferred for new code)
export { PDFGenerator } from '../pdfGenerator';

// Instance-based service (for backwards compatibility and PPPDV/reports)
export { PDFService, pdfService } from '../pdfService';

// Default export is the instance for backwards compatibility
export { default } from '../pdfService';
