/**
 * SEF (Sistem Elektronskih Faktura) API Types
 * Based on official API documentation from efaktura.gov.rs
 * 
 * Base URLs:
 * - Demo: https://demoefaktura.mfin.gov.rs
 * - Production: https://efaktura.mfin.gov.rs
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Invoice status in SEF system
 */
export enum SEFInvoiceStatus {
  Draft = 'Draft',
  New = 'New',
  Sent = 'Sent',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Storno = 'Storno',
  Sending = 'Sending',
  Mistake = 'Mistake',
}

/**
 * CIR (Central Invoice Registry) status
 */
export enum SEFCirStatus {
  None = 'None',
  Registered = 'Registered',
  Paid = 'Paid',
  PartiallyPaid = 'PartiallyPaid',
  Cancelled = 'Cancelled',
}

/**
 * VAT recording status
 */
export enum SEFVatRecordingStatus {
  Recorded = 'Recorded',
  Cancelled = 'Cancelled',
}

/**
 * VAT recording version
 */
export enum SEFVatRecordingVersion {
  First = 'First',
  Second = 'Second',
  Third = 'Third',
}

/**
 * VAT period options
 */
export enum SEFVatPeriod {
  January = 'January',
  February = 'February',
  March = 'March',
  April = 'April',
  May = 'May',
  June = 'June',
  July = 'July',
  August = 'August',
  September = 'September',
  October = 'October',
  November = 'November',
  December = 'December',
  FirstQuarter = 'FirstQuarter',
  SecondQuarter = 'SecondQuarter',
  ThirdQuarter = 'ThirdQuarter',
  FourthQuarter = 'FourthQuarter',
}

/**
 * VAT period range
 */
export enum SEFVatPeriodRange {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
}

/**
 * Document type for VAT recording
 */
export enum SEFDocumentType {
  Invoice = 'Invoice', // 380
  PrepaymentInvoice = 'PrepaymentInvoice', // 386
  DebitNote = 'DebitNote', // 383
  CreditNote = 'CreditNote', // 381
  InternalInvoiceForeignPerson = 'InternalInvoiceForeignPerson', // 400
  InternalInvoiceVatPayer = 'InternalInvoiceVatPayer', // 401
}

/**
 * Document direction for VAT recording
 */
export enum SEFDocumentDirection {
  Inbound = 'Inbound', // 0 - Nabavka
  Outbound = 'Outbound', // 1 - Isporuka
}

/**
 * Internal invoice option
 */
export enum SEFInternalInvoiceOption {
  Turnover = 'Turnover', // 1
  Prepayment = 'Prepayment', // 2
  Increase = 'Increase', // 3
  Decrease = 'Decrease', // 4
}

/**
 * Send to CIR option
 */
export enum SEFSendToCir {
  Yes = 'Yes',
  No = 'No',
}

/**
 * VAT category codes
 */
export enum SEFVatCategoryCode {
  S = 'S', // Standard rate (10% or 20%)
  Z = 'Z', // Zero rated
  E = 'E', // Exempt
  AE = 'AE', // Reverse charge
  O = 'O', // Outside scope
}

// =====================================================
// COMMON TYPES
// =====================================================

export interface SEFAddress {
  AddressId?: number;
  StreetAndHouse: string;
  PostalIndex?: string;
  City: string;
  CountryId: number;
}

export interface SEFBankAccount {
  BankAccountId?: number;
  BankId?: number;
  Currency?: string;
  Iban?: string;
  Swift?: string;
  IsPrimary: boolean;
  UnifiedBankAccount?: string;
}

export interface SEFCompanyInfo {
  CompanyId?: number;
  CountryId: number;
  Name: string;
  RegistrationCode: string; // Matični broj
  VatRegistrationCode: string; // PIB
  PhoneNumber?: string;
  ContactPerson?: string;
  ContactEmail?: string;
  Addresses: SEFAddress[];
  BankAccounts?: SEFBankAccount[];
  IsBudgetClient: boolean;
  SerbiaCompanyType?: 'BudgetUser' | 'PrivateCompany';
}

export interface SEFUnitMeasure {
  Code: string;
  Symbol?: string;
  NameEng: string;
  NameSrbLtn: string;
  NameSrbCyr: string;
  IsOnShortList: boolean;
}

// =====================================================
// SALES INVOICE TYPES
// =====================================================

export interface SEFMiniInvoiceDto {
  InvoiceId: number;
  PurchaseInvoiceId: number;
  SalesInvoiceId: number;
}

export interface SEFSimpleSalesInvoiceDto {
  Status: SEFInvoiceStatus;
  InvoiceId: number;
  GlobUniqId: string;
  Comment?: string;
  CirStatus: SEFCirStatus;
  CirInvoiceId?: number;
  Version: number;
  LastModifiedUtc: string;
  CirSettledAmount: number;
  VatNumberFactoringCompany?: string;
  FactoringContractNumber?: string;
  CancelComment?: string;
  StornoComment?: string;
}

export interface SEFInvoiceRow {
  RowId?: number;
  InvoiceId?: number;
  OrderNo: number;
  Code: string;
  Description: string;
  Unit: string;
  UnitPrice: number;
  Quantity: number;
  DiscountPercentage: number;
  DiscountAmount: number;
  SumWithoutVat: number;
  VatRate: number;
  VatSum: number;
  SumWithVat: number;
  VatNotCalculated: boolean;
  VatCategoryCode: SEFVatCategoryCode;
}

export interface SEFInvoiceDto {
  InvoiceId: number;
  SenderId: number;
  Sender: string;
  ReceiverId: number;
  Receiver: string;
  InvoiceNumber: string;
  AccountingDateUtc: string;
  PaymentDateUtc: string;
  InvoiceDateUtc: string;
  InvoiceSentDateUtc?: string;
  ReferenceNumber?: string;
  FineRatePerDay: number;
  Description?: string;
  Note?: string;
  OrderNumber?: string;
  Currency: string;
  DiscountPercentage: number;
  DiscountAmount: number;
  SumWithoutVat: number;
  VatRate: number;
  VatSum: number;
  SumWithVat: number;
  Status: SEFInvoiceStatus;
  TotalToPay: number;
  CirStatus: SEFCirStatus;
  CirInvoiceId?: number;
  CirSettledAmount: number;
  GlobUniqId: string;
  Rows: SEFInvoiceRow[];
  Attachments: unknown[];
  IsCreditInvoice: boolean;
  IsDebitNote: boolean;
  IsPrepaymentInvoice: boolean;
  IsProFormaInvoice: boolean;
  VatNotCalculated: boolean;
  Version: number;
  CreatedUtc: string;
  LastModifiedUtc: string;
}

export interface SEFCancelInvoiceRequest {
  invoiceId: number;
  cancelComments: string;
}

export interface SEFStornoInvoiceRequest {
  invoiceId: number;
  stornoNumber?: string;
  stornoComment: string;
}

export interface SEFSalesInvoiceListRequest {
  dateFrom?: string;
  dateTo?: string;
  status?: SEFInvoiceStatus;
}

export interface SEFSalesInvoiceIdListDto {
  InvoiceId: number;
  LastModifiedUtc: string;
  Status: SEFInvoiceStatus;
}

// =====================================================
// PURCHASE INVOICE TYPES
// =====================================================

export interface SEFSimplePurchaseInvoiceDto {
  Status: SEFInvoiceStatus;
  InvoiceId: number;
  GlobUniqId: string;
  Comment?: string;
  Version: number;
  LastModifiedUtc: string;
}

export interface SEFAcceptRejectRequest {
  invoiceId: number;
  comment?: string;
}

// =====================================================
// VAT RECORDING TYPES (до 1. септембра)
// =====================================================

export interface SEFVatTurnoverDto {
  VatTurnoverId?: number;
  TaxableAmount20: number;
  TaxAmount20: number;
  TotalAmount20: number;
  TaxableAmount10: number;
  TaxAmount10: number;
  TotalAmount10: number;
  TurnoverDescription10?: string;
  TurnoverDescription20?: string;
}

export interface SEFRelatedVatDocument {
  RelatedVatDocumentId?: number;
  DocumentNumber: string;
}

/**
 * Group VAT Recording (Zbirna evidencija PDV)
 */
export interface SEFGroupVatDto {
  GroupVatId?: number;
  CompanyId?: number;
  Year: number;
  VatPeriod: SEFVatPeriod;
  VatRecordingStatus?: SEFVatRecordingStatus;
  TurnoverWithFee?: SEFVatTurnoverDto;
  TurnoverWithoutFee?: SEFVatTurnoverDto;
  FutureTurnover?: SEFVatTurnoverDto;
  VatReductionFromPreviousPeriodAmount: number;
  VatIncreaseFromPreviousPeriodAmount: number;
  SendDate?: string;
  CalculationNumber: string;
  VatRecordingVersion?: SEFVatRecordingVersion;
  CreatedDateUtc?: string;
  StatusChangeDateUtc?: string;
  TurnoverDate?: string;
}

export interface SEFGroupVatListDto {
  GroupVatId: number;
  CompanyId: number;
  Year: number;
  VatPeriod: SEFVatPeriod;
  VatRecordingStatus: SEFVatRecordingStatus;
  SendDate?: string;
  VatRecordingVersion: SEFVatRecordingVersion;
  CalculationNumber: string;
  CreatedUtc: string;
  StatusChangeDate: string;
}

/**
 * Individual VAT Recording (Pojedinačna evidencija PDV)
 */
export interface SEFIndividualVatDto {
  IndividualVatId?: number;
  CompanyId?: number;
  Year: number;
  DocumentNumber?: string;
  VatRecordingStatus?: SEFVatRecordingStatus;
  SendDate?: string;
  TurnoverDate?: string;
  PaymentDate?: string;
  DocumentType: SEFDocumentType | string;
  TurnoverDescription?: string;
  TurnoverAmount: number;
  VatBaseAmount20: number;
  VatBaseAmount10: number;
  VatAmount: number;
  VatAmount10: number;
  VatAmount20: number;
  TotalAmount: number;
  VatDeductionRight?: string;
  RelatedDocuments?: SEFRelatedVatDocument[];
  BasisForPrepayment?: string;
  DocumentDirection: SEFDocumentDirection | string;
  RelatedPartyIdentifier?: string;
  ForeignDocument: boolean;
  TurnoverDescription20?: string;
  TurnoverDescription10?: string;
  VatPeriod: SEFVatPeriod | string;
  InternalInvoiceOption?: SEFInternalInvoiceOption | string;
  CalculationNumber: string;
  VatRecordingVersion?: SEFVatRecordingVersion;
  CreatedDateUtc?: string;
  StatusChangeDateUtc?: string;
}

export interface SEFIndividualVatListDto {
  IndividualVatId: number;
  Year: number;
  DocumentNumber?: string;
  VatRecordingStatus: SEFVatRecordingStatus;
  SendDate?: string;
  DocumentType: SEFDocumentType;
  TurnoverAmount: number;
  VatAmount: number;
  VatAmount10: number;
  VatAmount20: number;
  VatDeductionRight?: string;
  BasisForPrepayment?: string;
  DocumentDirection: SEFDocumentDirection;
  RelatedPartyIdentifier?: string;
  ForeignDocument: boolean;
  VatRecordingVersion: SEFVatRecordingVersion;
  CalculationNumber: string;
  InternalInvoiceOption?: SEFInternalInvoiceOption;
  VatPeriod: SEFVatPeriod;
  CreatedUtc: string;
  StatusChangeDate: string;
}

// =====================================================
// EPP - VAT DEDUCTION RECORD TYPES (Pretpodni porez)
// =====================================================

export interface SEFVatRateAmounts {
  Invoice_Base: number;
  Invoice_Vat: number;
  FiscalInvoice_Base?: number;
  FiscalInvoice_Vat?: number;
  OtherInvoice_Base?: number;
  OtherInvoice_Vat?: number;
  Total_Base: number;
  Total_Vat: number;
  Deduction_Vat?: number;
}

export interface SEFVatRateAmountsRecipient {
  InternalInvoiceForeigner_Base: number;
  InternalInvoiceForeigner_Vat: number;
  InternalInvoiceVatPayer_Base: number;
  InternalInvoiceVatPayer_Vat: number;
  Total_Base: number;
  Total_Vat: number;
  Deduction_Vat?: number;
}

export interface SEFVatRateAmountsDecrease {
  Invoice_Base: number;
  Invoice_Vat?: number;
  FiscalInvoice_Base?: number;
  FiscalInvoice_Vat?: number;
  OtherReductionDocuments_Base?: number;
  OtherReductionDocuments_Vat?: number;
  OtherDocumentation_Base?: number;
  OtherDocumentation_Vat?: number;
  Total_Base: number;
  Total_Vat?: number;
}

export interface SEFVatTurnoverCategory {
  TurnoverAtRateOf20Percent: SEFVatRateAmounts;
  TurnoverAtRateOf10Percent: SEFVatRateAmounts;
}

export interface SEFVatTurnoverCategoryRecipient {
  TurnoverAtRateOf20Percent: SEFVatRateAmountsRecipient;
  TurnoverAtRateOf10Percent: SEFVatRateAmountsRecipient;
}

export interface SEFTurnoverAsSupplier {
  FirstTransferOfTheRightToDispose: SEFVatTurnoverCategory;
  TurnoverExceptForTransferOfTheRight: SEFVatTurnoverCategory;
  IncreaseOfBaseIeVat: SEFVatTurnoverCategory;
  DecreaseOfBaseIeVat: SEFVatTurnoverCategory;
  FeePaidBeforeTurnoverIePrepayment: SEFVatTurnoverCategory;
  DecreaseOfPrepayment: SEFVatTurnoverCategory;
}

export interface SEFTurnoverAsRecipient {
  TransferOfTheRightToDispose: SEFVatTurnoverCategoryRecipient;
  TurnoverExceptForTransferOfTheRight: SEFVatTurnoverCategoryRecipient;
  IncreaseOfBaseIeVat: SEFVatTurnoverCategoryRecipient;
  DecreaseOfBaseIeVat: SEFVatTurnoverCategoryRecipient;
  FeePaidBeforeTurnoverIePrepayment: SEFVatTurnoverCategoryRecipient;
  DecreaseOfPrepayment: SEFVatTurnoverCategoryRecipient;
}

export interface SEFVatForImport {
  PaidVatRate20: number;
  PaidDeductibleVatRate20: number;
  PaidVatRate10: number;
  PaidDeductibleVatRate10: number;
  TotalPaidVat: number;
  TotalPaidDeductibleVat: number;
}

export interface SEFVatPaidToFarmer {
  TotalVatPaidToFarmer: number;
  TotalDeductibleVat: number;
}

export interface SEFCorrectionOfDeductableVatIncrease {
  VatDeductionBasedOnInvoice: number;
  VatDeductionBasedOnEqipmentAndFacilities: number;
  VatDeductionBasedOnDecisionOfTaxAuthority: number;
  VatDeductionBasedOnIncreaseOfVatDeductionInLastTaxPeriod: number;
  VatDeductionBasedOnVatRecord: number;
  VatDeductionBasedOnOtherReason: number;
}

export interface SEFCorrectionOfDeductableVatDecrease {
  VatDeductionBasedOnEquipmentAndFacilities: number;
  VatDeductionBasedOnDecisionOfTaxAuthority: number;
  VatDeductionBasedOnIncreaseOfVatDeductionInLastTaxPeriod: number;
  VatDeductionBasedOnDeletionRequestFromVatPayersRegister: number;
  VatDeductionBasedOnOtherReason: number;
  CorrectionOfDeductibleVatBasedOnCustomsAuthority: number;
  CorrectionOfDeductibleVatBasedOnVatPaidToFarmer: number;
}

export interface SEFCorrectionOfDeductableVat {
  CorrectionOfDeductibleVatAsIncrease: SEFCorrectionOfDeductableVatIncrease;
  CorrectionOfDeductibleVatAsDecrease: SEFCorrectionOfDeductableVatDecrease;
}

/**
 * VAT Deduction Record Request (EPP - Evidencija Prethodnog Poreza)
 */
export interface SEFVatDeductionRecordRequest {
  VatDeductionRecordNumber: string;
  TaxId: string;
  Year: number;
  VatPeriodRange: SEFVatPeriodRange | string;
  VatPeriod: SEFVatPeriod | string;
  GetAnalyticalBreakdown?: boolean;
  TurnoverAsSupplier?: Partial<SEFTurnoverAsSupplier>;
  TurnoverAsRecipient?: Partial<SEFTurnoverAsRecipient>;
  VatForImport?: Partial<SEFVatForImport>;
  VatPaidToFarmer?: Partial<SEFVatPaidToFarmer>;
  CorrectionOfDeductableVat?: Partial<SEFCorrectionOfDeductableVat>;
}

export interface SEFVatDeductionRecordResponse extends SEFVatDeductionRecordRequest {
  Id: number;
  Status: 'Draft' | 'Recorded' | 'Corrected';
  StatusChangeDate: string;
  RecordingDate: string;
  CreatedUtc: string;
  ParentId?: number;
}

export interface SEFSystemCalculationResponse {
  TaxId: string;
  Year: number;
  VatPeriodRange: SEFVatPeriodRange;
  VatPeriod: SEFVatPeriod;
  DataCollectionDate: string;
  TurnoverAsSupplier?: Partial<SEFTurnoverAsSupplier>;
  TurnoverAsRecipient?: Partial<SEFTurnoverAsRecipient>;
  VatForImport?: Partial<SEFVatForImport>;
}

// =====================================================
// CUSTOMS DECLARATION TYPES
// =====================================================

export interface SEFCustomsDeclaration {
  Id: number;
  DeclarationNumber: string;
  Status: string;
  PaymentDate?: string;
  VatAmount20: number;
  VatAmount10: number;
  TotalVat: number;
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export interface SEFNotificationSubscription {
  notificationUrl: string;
  authKey?: string;
}

export interface SEFNotificationPayload {
  EventType: 'SalesInvoiceStatusChanged' | 'PurchaseInvoiceReceived' | 'InvoiceStatusChanged';
  InvoiceId: number;
  NewStatus: SEFInvoiceStatus;
  OldStatus?: SEFInvoiceStatus;
  Timestamp: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface SEFApiError {
  Code: string;
  Message: string;
  Field?: string;
}

export interface SEFApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: SEFApiError[];
  message?: string;
}

// =====================================================
// EXEMPTION REASONS
// =====================================================

export interface SEFExemptionReason {
  Id: number;
  Key: string;
  NameEng: string;
  NameSrbLtn: string;
  NameSrbCyr: string;
}

// =====================================================
// COMPANY VERIFICATION
// =====================================================

export interface SEFCompanyCheckResult {
  exists: boolean;
  companyName?: string;
  vatNumber?: string;
  registrationCode?: string;
  isBudgetUser: boolean;
}
