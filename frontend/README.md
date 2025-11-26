# SEF eFakture Frontend

React application for the SEF eFakture system.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: shadcn/ui (Radix UI)
- **State Management**: Zustand / React Context
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## Setup

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Environment Variables**

    Create a `.env` file:

    ```env
    VITE_API_URL=http://localhost:3001/api
    ```

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Project Structure

- `src/components`: Reusable UI components
- `src/pages`: Page components (routes)
- `src/services`: API client and service functions
- `src/contexts`: React Context providers (Auth, Theme, etc.)
- `src/hooks`: Custom React hooks
- `src/lib`: Utility functions and libraries
