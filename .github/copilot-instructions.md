# SEF eFakture - AI Coding Instructions

## Project Context
Full-stack TypeScript application for integration with the Serbian SEF (Sistem Elektronskih Faktura) API.
The system handles invoice creation, UBL 2.1 XML generation, SEF API communication (with retries/night pause), and local PDF/XML management.

## Architecture & Structure
**Monorepo** with three main workspaces:
- **`frontend/`**: React 18 (Vite) + Tailwind + shadcn/ui.
- **`backend/`**: Node.js (Express) + Prisma + Bull (Queues).
- **`shared/`**: Common types, Zod schemas, and utilities.

### Key Directories
- `frontend/src/services/api.ts`: **CRITICAL**. Singleton `apiClient` for all HTTP requests.
- `backend/src/queue/`: Bull queues for async SEF operations (`invoiceQueue.ts`).
- `backend/src/services/sefService.ts`: Core SEF API wrapper.
- `backend/src/prisma/schema.prisma`: Database source of truth.

## Development Workflow
- **Build**: Run builds from specific directories: `cd frontend && npm run build`.
- **Database**: `cd backend && npx prisma migrate dev`.
- **Queues**: Redis is required for `invoiceQueue`.
- **Shared Lib**: Imports should look like `import { ... } from '@sef-app/shared'`.

## Coding Conventions

### General
- **Strict TypeScript**: No `any`. Use `unknown` for catch blocks and type guards (`isAxiosError`, `instanceof Error`).
- **Validation**: Use Zod schemas from `shared/` for both frontend forms and backend request validation.

### Frontend
- **API Calls**: ALWAYS use `apiClient` (e.g., `apiClient.get<T>('/endpoint')`).
  - Return type is `Promise<ApiResponse<T>>`.
  - Handle errors using `if (!response.success)`.
- **UI Components**: Use shadcn/ui components from `src/components/ui`.
- **State**: Use React Context for global state (Auth, Theme) and local state for forms.

### Backend
- **Pattern**: Controller -> Service -> Repository (Prisma).
- **Async Tasks**: Heavy SEF operations MUST go through `invoiceQueue`.
  - **Retries**: `SEFNetworkError` and `SEFServerError` trigger retries.
  - **Failures**: `SEFValidationError` marks invoice as `DRAFT` with error note (no retry).
  - **Night Pause**: Check `isNightPause()` before sending.
- **Database**: Use `prisma` singleton. Avoid raw SQL unless necessary for performance.
- **ERP Modules**:
  - **Calculations**: Use `Calculation` model for linking `IncomingInvoice` to inventory.
  - **Fixed Assets**: Use `FixedAsset` for depreciation tracking.
  - **Petty Cash**: Use `PettyCashAccount` and `PettyCashEntry`.
  - **Travel Orders**: Use `TravelOrder` for employee expenses.
  - **SEF VAT**: Use `SefVatEvidence` for individual/summary VAT recording.

### SEF Integration Rules
1. **UBL Generation**: Use `UBLGenerator` service. Do not manually construct XML strings.
2. **Idempotency**: Check if invoice exists in SEF before sending (if applicable).
3. **Error Handling**:
   - **Network/5xx**: Retry with exponential backoff.
   - **400/Validation**: Fail immediately, log error, update invoice status to `DRAFT`.
   - **Rate Limits**: Respect `Retry-After` headers.

## Common Patterns
**Frontend Error Handling**:
```typescript
try {
  const res = await apiClient.get<MyData>('/data');
  if (res.success) {
    setData(res.data);
  } else {
    toast.error(res.error || 'Operation failed');
  }
} catch (error: unknown) {
  if (axios.isAxiosError(error)) { ... }
}
```

**Backend Queue Processing**:
```typescript
// backend/src/queue/invoiceQueue.ts
if (error instanceof SEFNetworkError) {
  throw new RetryableError(error.message); // Bull will retry
} else if (error instanceof SEFValidationError) {
  // Update DB to failed state, do NOT retry
  throw new NonRetryableError(error.message);
}
```