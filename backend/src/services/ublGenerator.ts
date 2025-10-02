import { Builder } from 'xml2js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UBLInvoiceData {
  id: string;
  sefId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  documentType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  
  supplier: {
    name: string;
    pib: string;
    vatNumber?: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    email?: string;
    phone?: string;
    bankAccount?: string;
  };
  
  buyer: {
    name: string;
    pib: string;
    vatNumber?: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    email?: string;
    phone?: string;
  };
  
  lines: Array<{
    lineNumber: number;
    itemName: string;
    itemDescription?: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatCategory: string;
    vatAmount: number;
    lineTotalWithVat: number;
  }>;
  
  subtotal: number;
  totalVat: number;
  totalAmount: number;
  currency: string;
  note?: string;
}

export class UBLGenerator {
  private xmlBuilder: Builder;

  constructor() {
    this.xmlBuilder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });
  }

  /**
   * Generate UBL 2.1 XML for invoice
   */
  async generateInvoiceXML(invoiceId: string): Promise<string> {
    const invoiceData = await this.getInvoiceData(invoiceId);
    
    const ublDocument = this.createUBLInvoice(invoiceData);
    return this.xmlBuilder.buildObject(ublDocument);
  }

  /**
   * Get invoice data from database
   */
  private async getInvoiceData(invoiceId: string): Promise<UBLInvoiceData> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        supplier: true,
        buyer: true,
        lines: true
      }
    });

    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    return {
      id: invoice.id,
      sefId: invoice.sefId || undefined,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      documentType: invoice.documentType as 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE',
      
      supplier: {
        name: invoice.supplier.name,
        pib: invoice.supplier.pib,
        vatNumber: invoice.supplier.vatNumber || undefined,
        address: invoice.supplier.address,
        city: invoice.supplier.city,
        postalCode: invoice.supplier.postalCode,
        country: invoice.supplier.country,
        email: invoice.supplier.email || undefined,
        phone: invoice.supplier.phone || undefined,
        bankAccount: invoice.supplier.bankAccount || undefined
      },
      
      buyer: {
        name: invoice.buyer.name,
        pib: invoice.buyer.pib,
        vatNumber: invoice.buyer.vatNumber || undefined,
        address: invoice.buyer.address,
        city: invoice.buyer.city,
        postalCode: invoice.buyer.postalCode,
        country: invoice.buyer.country,
        email: invoice.buyer.email || undefined,
        phone: invoice.buyer.phone || undefined
      },
      
      lines: invoice.lines.map(line => ({
        lineNumber: line.lineNumber,
        itemName: line.itemName,
        itemDescription: line.itemDescription || undefined,
        quantity: Number(line.quantity),
        unitOfMeasure: line.unitOfMeasure,
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
        vatRate: Number(line.vatRate),
        vatCategory: line.vatCategory,
        vatAmount: Number(line.vatAmount),
        lineTotalWithVat: Number(line.lineTotalWithVat)
      })),
      
      subtotal: Number(invoice.subtotal),
      totalVat: Number(invoice.totalVat),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      note: invoice.note || undefined
    };
  }

  /**
   * Create UBL 2.1 Invoice structure
   */
  private createUBLInvoice(data: UBLInvoiceData): any {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return {
      'ubl:Invoice': {
        $: {
          'xmlns:ubl': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
          'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
          'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        },
        
        // Document identification
        'cbc:UBLVersionID': '2.1',
        'cbc:CustomizationID': 'urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2021',
        'cbc:ProfileID': 'urn:mfin.gov.rs:profiles:core:ver1.0',
        'cbc:ID': data.invoiceNumber,
        'cbc:IssueDate': data.issueDate,
        'cbc:InvoiceTypeCode': this.getInvoiceTypeCode(data.documentType),
        'cbc:DocumentCurrencyCode': data.currency,
        
        // Due date if present
        ...(data.dueDate && { 'cbc:DueDate': data.dueDate }),
        
        // Note if present
        ...(data.note && { 'cbc:Note': data.note }),
        
        // Supplier (AccountingSupplierParty)
        'cac:AccountingSupplierParty': {
          'cac:Party': {
            'cac:PartyName': {
              'cbc:Name': data.supplier.name
            },
            'cac:PostalAddress': {
              'cbc:StreetName': data.supplier.address,
              'cbc:CityName': data.supplier.city,
              'cbc:PostalZone': data.supplier.postalCode,
              'cac:Country': {
                'cbc:IdentificationCode': data.supplier.country
              }
            },
            'cac:PartyTaxScheme': {
              'cbc:CompanyID': data.supplier.pib,
              'cac:TaxScheme': {
                'cbc:ID': 'VAT'
              }
            },
            'cac:PartyLegalEntity': {
              'cbc:RegistrationName': data.supplier.name,
              ...(data.supplier.vatNumber && {
                'cbc:CompanyID': {
                  _: data.supplier.vatNumber,
                  $: { schemeID: 'VAT' }
                }
              })
            },
            ...(data.supplier.email && {
              'cac:Contact': {
                'cbc:ElectronicMail': data.supplier.email,
                ...(data.supplier.phone && { 'cbc:Telephone': data.supplier.phone })
              }
            })
          }
        },
        
        // Buyer (AccountingCustomerParty)
        'cac:AccountingCustomerParty': {
          'cac:Party': {
            'cac:PartyName': {
              'cbc:Name': data.buyer.name
            },
            'cac:PostalAddress': {
              'cbc:StreetName': data.buyer.address,
              'cbc:CityName': data.buyer.city,
              'cbc:PostalZone': data.buyer.postalCode,
              'cac:Country': {
                'cbc:IdentificationCode': data.buyer.country
              }
            },
            'cac:PartyTaxScheme': {
              'cbc:CompanyID': data.buyer.pib,
              'cac:TaxScheme': {
                'cbc:ID': 'VAT'
              }
            },
            'cac:PartyLegalEntity': {
              'cbc:RegistrationName': data.buyer.name,
              ...(data.buyer.vatNumber && {
                'cbc:CompanyID': {
                  _: data.buyer.vatNumber,
                  $: { schemeID: 'VAT' }
                }
              })
            }
          }
        },
        
        // Payment terms
        ...(data.supplier.bankAccount && {
          'cac:PaymentMeans': {
            'cbc:PaymentMeansCode': '42', // Account transfer
            'cac:PayeeFinancialAccount': {
              'cbc:ID': data.supplier.bankAccount
            }
          }
        }),
        
        // Tax totals
        'cac:TaxTotal': {
          'cbc:TaxAmount': {
            _: data.totalVat.toFixed(2),
            $: { currencyID: data.currency }
          },
          'cac:TaxSubtotal': this.createTaxSubtotals(data.lines, data.currency)
        },
        
        // Legal monetary totals
        'cac:LegalMonetaryTotal': {
          'cbc:LineExtensionAmount': {
            _: data.subtotal.toFixed(2),
            $: { currencyID: data.currency }
          },
          'cbc:TaxExclusiveAmount': {
            _: data.subtotal.toFixed(2),
            $: { currencyID: data.currency }
          },
          'cbc:TaxInclusiveAmount': {
            _: data.totalAmount.toFixed(2),
            $: { currencyID: data.currency }
          },
          'cbc:PayableAmount': {
            _: data.totalAmount.toFixed(2),
            $: { currencyID: data.currency }
          }
        },
        
        // Invoice lines
        'cac:InvoiceLine': data.lines.map(line => this.createInvoiceLine(line, data.currency))
      }
    };
  }

  /**
   * Get UBL invoice type code
   */
  private getInvoiceTypeCode(documentType: string): string {
    switch (documentType) {
      case 'INVOICE': return '380';
      case 'CREDIT_NOTE': return '381';
      case 'DEBIT_NOTE': return '383';
      default: return '380';
    }
  }

  /**
   * Create tax subtotals grouped by VAT rate
   */
  private createTaxSubtotals(lines: UBLInvoiceData['lines'], currency: string): any[] {
    const vatGroups = new Map<number, { total: number, vatAmount: number, category: string }>();
    
    lines.forEach(line => {
      const key = line.vatRate;
      if (!vatGroups.has(key)) {
        vatGroups.set(key, { total: 0, vatAmount: 0, category: line.vatCategory });
      }
      
      const group = vatGroups.get(key)!;
      group.total += line.lineTotal;
      group.vatAmount += line.vatAmount;
    });

    return Array.from(vatGroups.entries()).map(([rate, group]) => ({
      'cbc:TaxableAmount': {
        _: group.total.toFixed(2),
        $: { currencyID: currency }
      },
      'cbc:TaxAmount': {
        _: group.vatAmount.toFixed(2),
        $: { currencyID: currency }
      },
      'cac:TaxCategory': {
        'cbc:ID': this.getVATCategoryCode(group.category),
        'cbc:Percent': rate.toFixed(2),
        'cac:TaxScheme': {
          'cbc:ID': 'VAT'
        }
      }
    }));
  }

  /**
   * Create invoice line
   */
  private createInvoiceLine(line: UBLInvoiceData['lines'][0], currency: string): any {
    return {
      'cbc:ID': line.lineNumber.toString(),
      'cbc:InvoicedQuantity': {
        _: line.quantity.toString(),
        $: { unitCode: this.getUnitCode(line.unitOfMeasure) }
      },
      'cbc:LineExtensionAmount': {
        _: line.lineTotal.toFixed(2),
        $: { currencyID: currency }
      },
      'cac:Item': {
        'cbc:Name': line.itemName,
        ...(line.itemDescription && { 'cbc:Description': line.itemDescription }),
        'cac:ClassifiedTaxCategory': {
          'cbc:ID': this.getVATCategoryCode(line.vatCategory),
          'cbc:Percent': line.vatRate.toFixed(2),
          'cac:TaxScheme': {
            'cbc:ID': 'VAT'
          }
        }
      },
      'cac:Price': {
        'cbc:PriceAmount': {
          _: line.unitPrice.toFixed(2),
          $: { currencyID: currency }
        }
      }
    };
  }

  /**
   * Get VAT category code
   */
  private getVATCategoryCode(category: string): string {
    switch (category) {
      case 'STANDARD': return 'S';
      case 'ZERO_RATED': return 'Z';
      case 'EXEMPT': return 'E';
      case 'REVERSE_CHARGE': return 'AE';
      case 'NOT_SUBJECT': return 'O';
      default: return 'S';
    }
  }

  /**
   * Get unit code for UBL
   */
  private getUnitCode(unit: string): string {
    const unitMap: { [key: string]: string } = {
      'kom': 'C62', // piece
      'kg': 'KGM',  // kilogram
      'l': 'LTR',   // liter
      'h': 'HUR',   // hour
      'm': 'MTR',   // meter
      'm2': 'MTK',  // square meter
      'm3': 'MTQ',  // cubic meter
      'dan': 'DAY', // day
      'mesec': 'MON' // month
    };
    
    return unitMap[unit.toLowerCase()] || 'C62'; // Default to piece
  }

  /**
   * Validate UBL XML against Serbian requirements
   */
  async validateUBL(xml: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Basic XML structure validation
      // In production, you would use proper XSD validation
      
      if (!xml.includes('xmlns:ubl')) {
        errors.push('Missing UBL namespace declaration');
      }
      
      if (!xml.includes('cbc:CustomizationID')) {
        errors.push('Missing CustomizationID');
      }
      
      if (!xml.includes('urn:mfin.gov.rs:srbdt')) {
        errors.push('Missing Serbian customization identifier');
      }
      
      // More validation rules would be implemented here
      
      return { valid: errors.length === 0, errors };
      
    } catch (error) {
      return { 
        valid: false, 
        errors: [`XML validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }
}

export default UBLGenerator;