# MEFEN Moskee Beheer - Architecture

## Overview

MEFEN Moskee Beheer is a full-stack web application designed for mosque member management. The system allows administrators to manage member data, track payments, and generate reports. The architecture follows a modern client-server model with a React frontend and an Express.js backend, supporting both PostgreSQL and Firebase as data storage options.

## System Architecture

The application follows a typical three-tier architecture:

1. **Presentation Layer (Frontend)**: React-based SPA with TailwindCSS and Shadcn UI components
2. **Application Layer (Backend)**: Express.js server with RESTful API endpoints
3. **Data Layer**: Dual database approach with PostgreSQL (via Drizzle ORM) and Firebase Realtime Database

### Key Architectural Decisions

#### 1. Dual Database Strategy

The application is designed to work with both PostgreSQL (through Drizzle ORM) and Firebase Realtime Database, allowing for flexible deployment options:

- **Primary Implementation**: PostgreSQL with Drizzle ORM for structured data storage
- **Alternative Implementation**: Firebase Realtime Database for simplified deployment in environments where PostgreSQL setup is challenging

This approach enables deployment in various environments, from fully self-hosted setups to cloud-based solutions with minimal infrastructure requirements.

#### 2. Monorepo Structure

The application uses a monorepo approach with shared code between frontend and backend:

```
├── client/          # Frontend React application
├── server/          # Express.js backend
└── shared/          # Shared code (schemas, types)
```

This structure facilitates code sharing and ensures type safety across the stack, particularly for data models and validation schemas.

#### 3. TypeScript Throughout

TypeScript is used across both frontend and backend to provide type safety and improved developer experience. This helps catch errors at compile time and provides better documentation through type definitions.

## Key Components

### Frontend

- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: React Query for server state
- **UI Components**: Shadcn UI (built on Radix UI primitives)
- **Styling**: TailwindCSS with custom theme configuration
- **Form Handling**: React Hook Form with Zod validation

The frontend is organized as follows:
- `client/src/components/`: Reusable UI components
- `client/src/hooks/`: Custom React hooks
- `client/src/lib/`: Utility functions and configuration
- `client/src/pages/`: Page components corresponding to routes

### Backend

- **Framework**: Express.js with TypeScript
- **API Structure**: RESTful endpoints for member management
- **Database Access Layer**: Abstracted via storage interface supporting PostgreSQL/Firebase

The backend is organized as follows:
- `server/routes.ts`: API route definitions
- `server/storage.ts`: Database abstraction layer
- `server/db.ts`: Database connection handling (PostgreSQL)

### Data Models

The application's primary data models are defined in `shared/schema.ts`:

1. **Users**: Authentication users with email/password
2. **Members**: Member records with personal and payment information
3. **DeletedMemberNumbers**: Tracking of deleted member IDs for potential reuse

These models are used to generate both database schemas (via Drizzle ORM) and validation schemas (via Zod).

## Data Flow

### Authentication Flow

1. User logs in via Firebase Authentication
2. Authentication state is managed client-side using React Firebase hooks
3. Protected routes check for authentication state
4. API requests include Firebase authentication tokens

### Member Management Flow

1. Client requests member data via API endpoints
2. Server retrieves data from the database (PostgreSQL or Firebase)
3. Data is validated against shared schemas
4. Client renders member information with potential to edit/delete
5. Changes are persisted back to the database via API calls

## External Dependencies

### Core Dependencies

1. **Firebase**: Authentication and alternative database option
   - Authentication
   - Realtime Database (optional storage backend)

2. **Neon Database**: PostgreSQL provider (for the primary storage option)
   - Connection via `@neondatabase/serverless`

3. **UI Framework**: Shadcn UI with Radix UI primitives
   - Provides accessible and customizable UI components

4. **PDF Generation**: React PDF for report generation
   - Used for exporting member data

### Development Dependencies

1. **Vite**: Frontend build tool and development server
2. **ESBuild**: Backend bundling for production
3. **Drizzle ORM**: Database schema management and migrations

## Deployment Strategy

The application supports multiple deployment strategies:

### 1. Vercel Deployment (Primary)

The application includes configuration for deployment on Vercel:
- Frontend: Static site deployment
- Backend: Serverless functions
- Database: Neon PostgreSQL (external service)

Configuration is defined in `vercel.json` with appropriate build settings.

### 2. Firebase Deployment (Alternative)

An alternative deployment approach using Firebase services:
- Frontend: Firebase Hosting
- Backend: Firebase Functions or direct Firebase SDK access
- Database: Firebase Realtime Database

This approach reduces server requirements and is suitable for simpler deployments.

### 3. Self-Hosted Option

The application can also be deployed in a self-hosted environment:
- Build with `npm run build`
- Start with `npm run start`
- Requires PostgreSQL database

## Development Environment

The repository is configured for development using:
1. **Replit**: Online IDE support with custom configuration
2. **Local Development**: Standard Node.js development environment

Each approach uses the same core application code with environment-specific configuration.