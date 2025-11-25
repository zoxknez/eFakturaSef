import { PrismaClient, UserRole, PartnerType, InvoiceStatus, InvoiceType, InvoicePaymentStatus, AccountType, AccountSide, FiscalYearStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ========================================
  // 1. CREATE COMPANY
  // ========================================
  const company = await prisma.company.upsert({
    where: { pib: '123456789' },
    update: {},
    create: {
      pib: '123456789',
      name: 'Demo Preduzeće DOO',
      address: 'Knez Mihailova 1',
      city: 'Beograd',
      postalCode: '11000',
      country: 'RS',
      email: 'info@demo-preduzece.rs',
      phone: '+381 11 123 4567',
      bankAccount: '160-1234567890123-45',
      vatNumber: 'RS123456789',
      sefEnvironment: 'demo',
      autoStockDeduction: true,
    },
  });
  console.log('✅ Company created:', company.name);

  // ========================================
  // 2. CREATE ADMIN USER
  // ========================================
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo-preduzece.rs' },
    update: {},
    create: {
      email: 'admin@demo-preduzece.rs',
      firstName: 'Admin',
      lastName: 'Korisnik',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
      companyId: company.id,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Create accountant user
  const accountantUser = await prisma.user.upsert({
    where: { email: 'racunovodja@demo-preduzece.rs' },
    update: {},
    create: {
      email: 'racunovodja@demo-preduzece.rs',
      firstName: 'Marija',
      lastName: 'Računovođa',
      password: hashedPassword,
      role: UserRole.ACCOUNTANT,
      isActive: true,
      companyId: company.id,
    },
  });
  console.log('✅ Accountant user created:', accountantUser.email);

  // ========================================
  // 3. CREATE PARTNERS
  // ========================================
  const partners = [
    {
      type: PartnerType.BUYER,
      pib: '987654321',
      name: 'Kupac Jedan DOO',
      shortName: 'Kupac 1',
      address: 'Bulevar oslobođenja 123',
      city: 'Novi Sad',
      postalCode: '21000',
      email: 'kupac1@example.com',
      phone: '+381 21 555 1234',
      vatPayer: true,
      vatNumber: 'RS987654321',
      defaultPaymentTerms: 30,
      creditLimit: new Decimal(500000),
      isActive: true,
      companyId: company.id,
    },
    {
      type: PartnerType.BUYER,
      pib: '111222333',
      name: 'Kupac Dva AD',
      shortName: 'Kupac 2',
      address: 'Cara Dušana 45',
      city: 'Niš',
      postalCode: '18000',
      email: 'kupac2@example.com',
      vatPayer: true,
      defaultPaymentTerms: 15,
      isActive: true,
      companyId: company.id,
    },
    {
      type: PartnerType.SUPPLIER,
      pib: '444555666',
      name: 'Dobavljač Materijala DOO',
      shortName: 'Dobavljač 1',
      address: 'Industrijska zona bb',
      city: 'Subotica',
      postalCode: '24000',
      email: 'dobavljac@example.com',
      vatPayer: true,
      vatNumber: 'RS444555666',
      defaultPaymentTerms: 45,
      isActive: true,
      companyId: company.id,
    },
    {
      type: PartnerType.BOTH,
      pib: '777888999',
      name: 'Partner Kompanija DOO',
      shortName: 'Partner',
      address: 'Glavni trg 10',
      city: 'Kragujevac',
      postalCode: '34000',
      email: 'partner@example.com',
      vatPayer: true,
      defaultPaymentTerms: 30,
      creditLimit: new Decimal(1000000),
      isActive: true,
      companyId: company.id,
    },
  ];

  for (const partnerData of partners) {
    const partner = await prisma.partner.upsert({
      where: {
        unique_partner_pib_per_company: {
          companyId: company.id,
          pib: partnerData.pib,
        },
      },
      update: {},
      create: partnerData,
    });
    console.log('✅ Partner created:', partner.name);
  }

  // ========================================
  // 4. CREATE PRODUCTS
  // ========================================
  const products = [
    {
      code: 'PROD-001',
      barcode: '8600000000001',
      name: 'IT Usluge - Razvoj softvera',
      description: 'Usluge razvoja softvera po satu',
      category: 'Usluge',
      subcategory: 'IT',
      unitPrice: new Decimal(5000),
      costPrice: new Decimal(3000),
      vatRate: new Decimal(20),
      unit: 'h',
      trackInventory: false,
      isActive: true,
      companyId: company.id,
    },
    {
      code: 'PROD-002',
      barcode: '8600000000002',
      name: 'IT Usluge - Održavanje',
      description: 'Mesečno održavanje sistema',
      category: 'Usluge',
      subcategory: 'IT',
      unitPrice: new Decimal(30000),
      costPrice: new Decimal(20000),
      vatRate: new Decimal(20),
      unit: 'mesec',
      trackInventory: false,
      isActive: true,
      companyId: company.id,
    },
    {
      code: 'PROD-003',
      barcode: '8600000000003',
      name: 'Laptop računar',
      description: 'Poslovni laptop računar',
      category: 'Oprema',
      subcategory: 'Računari',
      unitPrice: new Decimal(120000),
      costPrice: new Decimal(95000),
      vatRate: new Decimal(20),
      unit: 'kom',
      trackInventory: true,
      currentStock: new Decimal(25),
      minStock: new Decimal(5),
      maxStock: new Decimal(50),
      isActive: true,
      companyId: company.id,
    },
    {
      code: 'PROD-004',
      name: 'Konzultantske usluge',
      description: 'Poslovne konzultacije',
      category: 'Usluge',
      subcategory: 'Konsalting',
      unitPrice: new Decimal(8000),
      vatRate: new Decimal(20),
      unit: 'h',
      trackInventory: false,
      isActive: true,
      companyId: company.id,
    },
    {
      code: 'PROD-005',
      barcode: '8600000000005',
      name: 'Kancelarijski materijal',
      description: 'Papir, olovke, fascikle',
      category: 'Materijal',
      subcategory: 'Kancelarija',
      unitPrice: new Decimal(1500),
      costPrice: new Decimal(1200),
      vatRate: new Decimal(20),
      unit: 'kom',
      trackInventory: true,
      currentStock: new Decimal(100),
      minStock: new Decimal(20),
      isActive: true,
      companyId: company.id,
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: {
        unique_product_code_per_company: {
          companyId: company.id,
          code: productData.code,
        },
      },
      update: {},
      create: productData,
    });
    console.log('✅ Product created:', product.name);
  }

  // ========================================
  // 5. CREATE CHART OF ACCOUNTS (Kontni plan)
  // ========================================
  const accounts = [
    // Klasa 0 - Neuplaćeni upisani kapital i stalna imovina
    { code: '0', name: 'Neuplaćeni upisani kapital i stalna imovina', level: 1, type: AccountType.ASSET, normalSide: AccountSide.DEBIT, isSystem: true },
    { code: '01', name: 'Nematerijalna ulaganja', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '02', name: 'Nekretnine, postrojenja i oprema', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '020', name: 'Zemljišta', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '022', name: 'Građevinski objekti', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '023', name: 'Oprema', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },

    // Klasa 1 - Zalihe
    { code: '1', name: 'Zalihe', level: 1, type: AccountType.ASSET, normalSide: AccountSide.DEBIT, isSystem: true },
    { code: '10', name: 'Materijal', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '13', name: 'Roba', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '14', name: 'Gotovi proizvodi', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },

    // Klasa 2 - Kratkoročna potraživanja, plasmani i gotovina
    { code: '2', name: 'Kratkoročna potraživanja, plasmani i gotovina', level: 1, type: AccountType.ASSET, normalSide: AccountSide.DEBIT, isSystem: true },
    { code: '20', name: 'Potraživanja po osnovu prodaje', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '2020', name: 'Kupci u zemlji', level: 4, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '2021', name: 'Kupci u inostranstvu', level: 4, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '24', name: 'Gotovinski ekvivalenti i gotovina', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '241', name: 'Tekući (poslovni) računi', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '243', name: 'Blagajna', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '27', name: 'PDV', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
    { code: '270', name: 'PDV u primljenim fakturama', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },

    // Klasa 3 - Kapital
    { code: '3', name: 'Kapital', level: 1, type: AccountType.EQUITY, normalSide: AccountSide.CREDIT, isSystem: true },
    { code: '30', name: 'Osnovni kapital', level: 2, type: AccountType.EQUITY, normalSide: AccountSide.CREDIT },
    { code: '34', name: 'Neraspoređeni dobitak', level: 2, type: AccountType.EQUITY, normalSide: AccountSide.CREDIT },
    { code: '35', name: 'Gubitak', level: 2, type: AccountType.EQUITY, normalSide: AccountSide.DEBIT },

    // Klasa 4 - Dugoročna rezervisanja i obaveze
    { code: '4', name: 'Dugoročna rezervisanja i obaveze', level: 1, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT, isSystem: true },
    { code: '43', name: 'Obaveze prema dobavljačima', level: 2, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
    { code: '4310', name: 'Dobavljači u zemlji', level: 4, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
    { code: '4311', name: 'Dobavljači u inostranstvu', level: 4, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
    { code: '47', name: 'Obaveze za PDV', level: 2, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
    { code: '470', name: 'Obaveze za PDV po izdatim fakturama', level: 3, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },

    // Klasa 5 - Rashodi
    { code: '5', name: 'Rashodi', level: 1, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT, isSystem: true },
    { code: '50', name: 'Nabavna vrednost prodate robe', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
    { code: '51', name: 'Troškovi materijala', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
    { code: '52', name: 'Troškovi zarada', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
    { code: '53', name: 'Troškovi amortizacije', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
    { code: '55', name: 'Ostali poslovni rashodi', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },

    // Klasa 6 - Prihodi
    { code: '6', name: 'Prihodi', level: 1, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT, isSystem: true },
    { code: '60', name: 'Prihodi od prodaje robe', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
    { code: '61', name: 'Prihodi od prodaje proizvoda i usluga', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
    { code: '65', name: 'Ostali poslovni prihodi', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },

    // Klasa 7 - Otvaranje i zaključak
    { code: '7', name: 'Otvaranje i zaključak računa', level: 1, type: AccountType.OFF_BALANCE, normalSide: AccountSide.DEBIT, isSystem: true },
    { code: '70', name: 'Otvaranje glavne knjige', level: 2, type: AccountType.OFF_BALANCE, normalSide: AccountSide.DEBIT },
    { code: '71', name: 'Zaključak računa uspjeha', level: 2, type: AccountType.OFF_BALANCE, normalSide: AccountSide.DEBIT },
  ];

  for (const accountData of accounts) {
    const account = await prisma.account.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: accountData.code,
        },
      },
      update: {},
      create: {
        ...accountData,
        companyId: company.id,
      },
    });
    console.log('✅ Account created:', account.code, '-', account.name);
  }

  // ========================================
  // 6. CREATE FISCAL YEAR
  // ========================================
  const currentYear = new Date().getFullYear();
  
  const fiscalYear = await prisma.fiscalYear.upsert({
    where: {
      companyId_year: {
        companyId: company.id,
        year: currentYear,
      },
    },
    update: {},
    create: {
      year: currentYear,
      startDate: new Date(`${currentYear}-01-01`),
      endDate: new Date(`${currentYear}-12-31`),
      status: FiscalYearStatus.OPEN,
      companyId: company.id,
    },
  });
  console.log('✅ Fiscal year created:', fiscalYear.year);

  // ========================================
  // 7. CREATE SAMPLE INVOICES
  // ========================================
  const partner1 = await prisma.partner.findFirst({
    where: { companyId: company.id, pib: '987654321' },
  });

  const product1 = await prisma.product.findFirst({
    where: { companyId: company.id, code: 'PROD-001' },
  });

  if (partner1 && product1) {
    // Draft invoice
    const draftInvoice = await prisma.invoice.upsert({
      where: {
        unique_invoice_number_per_company: {
          companyId: company.id,
          invoiceNumber: 'INV-2024-001',
        },
      },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-001',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: InvoiceStatus.DRAFT,
        type: InvoiceType.OUTGOING,
        partnerId: partner1.id,
        totalAmount: new Decimal(60000),
        taxAmount: new Decimal(10000),
        currency: 'RSD',
        paymentStatus: InvoicePaymentStatus.UNPAID,
        companyId: company.id,
        lines: {
          create: [
            {
              lineNumber: 1,
              productId: product1.id,
              itemName: product1.name,
              itemDescription: product1.description,
              quantity: new Decimal(10),
              unit: 'h',
              unitPrice: new Decimal(5000),
              taxRate: new Decimal(20),
              taxAmount: new Decimal(10000),
              amount: new Decimal(60000),
            },
          ],
        },
      },
    });
    console.log('✅ Draft invoice created:', draftInvoice.invoiceNumber);

    // Sent invoice
    const sentInvoice = await prisma.invoice.upsert({
      where: {
        unique_invoice_number_per_company: {
          companyId: company.id,
          invoiceNumber: 'INV-2024-002',
        },
      },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-002',
        issueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        status: InvoiceStatus.SENT,
        type: InvoiceType.OUTGOING,
        partnerId: partner1.id,
        totalAmount: new Decimal(150000),
        taxAmount: new Decimal(25000),
        currency: 'RSD',
        paymentStatus: InvoicePaymentStatus.UNPAID,
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        lines: {
          create: [
            {
              lineNumber: 1,
              productId: product1.id,
              itemName: 'IT Usluge - Razvoj softvera',
              quantity: new Decimal(20),
              unit: 'h',
              unitPrice: new Decimal(5000),
              taxRate: new Decimal(20),
              taxAmount: new Decimal(16666.67),
              amount: new Decimal(100000),
            },
            {
              lineNumber: 2,
              itemName: 'Konzultacije',
              quantity: new Decimal(5),
              unit: 'h',
              unitPrice: new Decimal(8000),
              taxRate: new Decimal(20),
              taxAmount: new Decimal(6666.67),
              amount: new Decimal(40000),
            },
          ],
        },
      },
    });
    console.log('✅ Sent invoice created:', sentInvoice.invoiceNumber);

    // Accepted and partially paid invoice
    const acceptedInvoice = await prisma.invoice.upsert({
      where: {
        unique_invoice_number_per_company: {
          companyId: company.id,
          invoiceNumber: 'INV-2024-003',
        },
      },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-003',
        issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: InvoiceStatus.ACCEPTED,
        type: InvoiceType.OUTGOING,
        partnerId: partner1.id,
        totalAmount: new Decimal(240000),
        taxAmount: new Decimal(40000),
        currency: 'RSD',
        paymentStatus: InvoicePaymentStatus.PARTIALLY_PAID,
        paidAmount: new Decimal(100000),
        sentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        companyId: company.id,
        lines: {
          create: [
            {
              lineNumber: 1,
              itemName: 'Mesečno održavanje sistema',
              quantity: new Decimal(2),
              unit: 'mesec',
              unitPrice: new Decimal(30000),
              taxRate: new Decimal(20),
              taxAmount: new Decimal(10000),
              amount: new Decimal(60000),
            },
            {
              lineNumber: 2,
              itemName: 'Laptop računar',
              quantity: new Decimal(1),
              unit: 'kom',
              unitPrice: new Decimal(120000),
              taxRate: new Decimal(20),
              taxAmount: new Decimal(20000),
              amount: new Decimal(120000),
            },
          ],
        },
      },
    });
    console.log('✅ Accepted invoice created:', acceptedInvoice.invoiceNumber);

    // Create payment for the accepted invoice
    await prisma.payment.create({
      data: {
        invoiceId: acceptedInvoice.id,
        amount: new Decimal(100000),
        currency: 'RSD',
        paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        method: PaymentMethod.BANK_TRANSFER,
        reference: '97-123456789',
        status: PaymentStatus.CLEARED,
        createdBy: adminUser.id,
      },
    });
    console.log('✅ Payment created for invoice:', acceptedInvoice.invoiceNumber);
  }

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Created data summary:');
  console.log('   - 1 Company: Demo Preduzeće DOO');
  console.log('   - 2 Users (admin@demo-preduzece.rs, racunovodja@demo-preduzece.rs)');
  console.log('   - 4 Partners (buyers, suppliers)');
  console.log('   - 5 Products');
  console.log('   - 40+ Accounts (Chart of Accounts)');
  console.log('   - 1 Fiscal Year');
  console.log('   - 3 Sample Invoices');
  console.log('   - 1 Payment');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('   Email: admin@demo-preduzece.rs');
  console.log('   Password: admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
