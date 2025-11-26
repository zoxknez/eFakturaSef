# SEF eFakture Backend

Node.js Express application serving the API for the SEF eFakture system.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Queue**: Bull (Redis)
- **Validation**: Zod
- **Authentication**: Passport.js (JWT)

## Setup

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Environment Variables**

    Create a `.env` file in this directory (or rely on the root one if using monorepo tools, but usually backend needs its own).

    ```env
    PORT=3001
    DATABASE_URL="postgresql://user:password@localhost:5432/sef_efakture"
    REDIS_URL="redis://localhost:6379"
    JWT_SECRET="your-secret"
    JWT_REFRESH_SECRET="your-refresh-secret"
    SEF_API_KEY="your-sef-api-key"
    ```

3.  **Database Migration**

    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

## Scripts

- `npm run dev`: Start development server with hot-reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run the compiled application
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript compiler check

## API Documentation

Swagger documentation is available at `/api-docs` when the server is running.

## Project Structure

- `src/controllers`: Request handlers
- `src/services`: Business logic
- `src/routes`: API route definitions
- `src/middleware`: Express middleware
- `src/prisma`: Database schema and client
- `src/queue`: Background job processors
