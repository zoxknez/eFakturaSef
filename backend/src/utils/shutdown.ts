// Graceful shutdown handling za backend server
import { Request, Response, NextFunction } from 'express';

let server: any = null;

export const setServer = (serverInstance: any) => {
  server = serverInstance;
};

export const gracefulShutdown = (signal: string) => {
  console.log(`\n🔄 Primljen ${signal}, pokušavam graceful shutdown...`);

  if (server) {
    server.close((err: any) => {
      if (err) {
        console.error('❌ Greška pri zatvaranju servera:', err);
        process.exit(1);
      }

      console.log('✅ Server uspešno zatvoren');
      process.exit(0);
    });

    // Force exit nakon 10 sekundi
    setTimeout(() => {
      console.log('⏰ Force exit nakon timeout-a');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Process event listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection:', reason);
  // Ne gasi proces odmah, samo loguji
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
