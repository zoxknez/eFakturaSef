"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Demo companies
    const demoCompany = await prisma.company.upsert({
        where: { pib: '12345678' },
        update: {},
        create: {
            pib: '12345678',
            name: 'Demo Company d.o.o.',
            address: 'Knez Mihailova 1',
            city: 'Beograd',
            postalCode: '11000',
            country: 'RS',
            email: 'info@democompany.rs',
            phone: '+381 11 123 4567',
            bankAccount: '160-43200-78',
            vatNumber: 'RS12345678',
            sefApiKey: 'demo-api-key-123',
            sefEnvironment: 'demo',
        },
    });
    const clientCompany = await prisma.company.upsert({
        where: { pib: '87654321' },
        update: {},
        create: {
            pib: '87654321',
            name: 'ABC Client d.o.o.',
            address: 'Terazije 15',
            city: 'Beograd',
            postalCode: '11000',
            country: 'RS',
            email: 'fakture@abcclient.rs',
            phone: '+381 11 987 6543',
            bankAccount: '265-11200-99',
            vatNumber: 'RS87654321',
        },
    });
    // Demo users
    const hashedPassword = await bcryptjs_1.default.hash('demo123', 12);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@democompany.rs' },
        update: {},
        create: {
            email: 'admin@democompany.rs',
            firstName: 'Marko',
            lastName: 'Adminović',
            password: hashedPassword,
            role: 'ADMIN',
            companyId: demoCompany.id,
        },
    });
    const accountantUser = await prisma.user.upsert({
        where: { email: 'racunovodja@democompany.rs' },
        update: {},
        create: {
            email: 'racunovodja@democompany.rs',
            firstName: 'Ana',
            lastName: 'Računović',
            password: hashedPassword,
            role: 'ACCOUNTANT',
            companyId: demoCompany.id,
        },
    });
    // Demo invoices
    const invoice1 = await prisma.invoice.create({
        data: {
            invoiceNumber: '2024-001',
            issueDate: new Date('2024-10-01'),
            dueDate: new Date('2024-10-16'),
            direction: 'OUTGOING',
            status: 'ACCEPTED',
            documentType: 'INVOICE',
            supplierId: demoCompany.id,
            buyerId: clientCompany.id,
            subtotal: 100000,
            totalVat: 20000,
            totalAmount: 120000,
            currency: 'RSD',
            note: 'Konsultantske usluge - oktobar 2024',
            companyId: demoCompany.id,
            sefId: 'SEF-2024-001-ABC123',
            sentAt: new Date('2024-10-01T14:30:00Z'),
        },
    });
    const invoice2 = await prisma.invoice.create({
        data: {
            invoiceNumber: '2024-002',
            issueDate: new Date('2024-10-02'),
            dueDate: new Date('2024-10-17'),
            direction: 'INCOMING',
            status: 'SENT',
            documentType: 'INVOICE',
            supplierId: clientCompany.id,
            buyerId: demoCompany.id,
            subtotal: 70000,
            totalVat: 14000,
            totalAmount: 84000,
            currency: 'RSD',
            note: 'Materijali za projekat',
            companyId: demoCompany.id,
        },
    });
    // Invoice items for detailed view
    await prisma.invoiceLine.createMany({
        data: [
            {
                invoiceId: invoice1.id,
                lineNumber: 1,
                itemName: 'Konsultantske usluge',
                itemDescription: 'Konsultantske usluge - oktobar 2024',
                quantity: 1,
                unitPrice: 100000,
                lineTotal: 100000,
                vatRate: 20,
                vatCategory: 'STANDARD',
                vatAmount: 20000,
                lineTotalWithVat: 120000,
                unitOfMeasure: 'h',
            },
            {
                invoiceId: invoice2.id,
                lineNumber: 1,
                itemName: 'Kancelarijski materijal',
                itemDescription: 'Kancelarijski materijal - razno',
                quantity: 10,
                unitPrice: 7000,
                lineTotal: 70000,
                vatRate: 20,
                vatCategory: 'STANDARD',
                vatAmount: 14000,
                lineTotalWithVat: 84000,
                unitOfMeasure: 'kom',
            },
        ],
    });
    // Invoice status changes will be tracked via AuditLog model
    console.log('✅ Database seeded successfully!');
    console.log(`👤 Demo users created:`);
    console.log(`   Admin: admin@democompany.rs / demo123`);
    console.log(`   Accountant: racunovodja@democompany.rs / demo123`);
    console.log(`🏢 Companies: ${demoCompany.name}, ${clientCompany.name}`);
    console.log(`📄 Sample invoices created`);
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map