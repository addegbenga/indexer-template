// import Fastify from 'fastify';
// import { spawn, ChildProcess } from 'child_process';

// const fastify = Fastify({
//   logger: {
//     level: 'info',
//   }
// });

// // Get indexer type from command line arguments only
// const INDEXER_TYPE = process.argv[2] || 'dapp';
// const INDEXER_NAME = INDEXER_TYPE === 'dapp' ? 'MEDIALANO-DAPP' : 'MEDIALANO-MIPP';
// const PORT = Number(process.env.PORT) || 3000;

// let indexerProcess: ChildProcess | null = null;
// let indexerStats = {
//   status: 'initializing',
//   startTime: new Date().toISOString(),
//   restarts: 0,
//   lastRestart: null as string | null,
//   lastError: null as string | null,
//   pid: null as number | null
// };

// // Health check route
// fastify.get('/', async (request, reply) => {
//   return {
//     service: `${INDEXER_NAME}-deployment-service`,
//     status: indexerStats.status,
//     uptime: Math.floor(process.uptime()),
//     indexer: {
//       name: INDEXER_NAME,
//       type: INDEXER_TYPE,
//       pid: indexerStats.pid,
//       status: indexerStats.status,
//       restarts: indexerStats.restarts,
//       startTime: indexerStats.startTime,
//       lastRestart: indexerStats.lastRestart,
//       lastError: indexerStats.lastError
//     },
//     environment: {
//       nodeEnv: process.env.NODE_ENV || 'production',
//       contractAddress: process.env.CONTRACT_ADDRESS,
//       startingBlock: process.env.STARTING_BLOCK,
//       streamUrl: process.env.STREAM_URL,
//       preset: 'sepolia'
//     },
//     timestamp: new Date().toISOString()
//   };
// });

// // Detailed status route
// fastify.get('/status', async (request, reply) => {
//   return {
//     ...indexerStats,
//     uptime: Math.floor(process.uptime()),
//     memoryUsage: process.memoryUsage(),
//     environment: process.env,
//     config: {
//       indexerName: INDEXER_NAME,
//       indexerType: INDEXER_TYPE,
//       port: PORT
//     }
//   };
// });

// // Health check for load balancers
// fastify.get('/health', async (request, reply) => {
//   if (indexerStats.status === 'running' || indexerStats.status === 'starting') {
//     reply.code(200);
//     return { status: 'healthy', indexer: indexerStats.status };
//   } else {
//     reply.code(503);
//     return { status: 'unhealthy', indexer: indexerStats.status, error: indexerStats.lastError };
//   }
// });

// // Restart endpoint (useful for debugging)
// fastify.post('/restart', async (request, reply) => {
//   fastify.log.info('Manual restart requested');
//   restartIndexer();
//   return { message: 'Indexer restart initiated', timestamp: new Date().toISOString() };
// });

// // Logs endpoint (last 100 lines)
// fastify.get('/logs', async (request, reply) => {
//   // This would require implementing log storage, for now just return basic info
//   return {
//     message: 'Logs endpoint - implement log storage if needed',
//     indexer: INDEXER_NAME,
//     status: indexerStats.status,
//     lastRestart: indexerStats.lastRestart
//   };
// });

// // Start the indexer process
// const startIndexer = async () => {
//   try {
//     fastify.log.info(`Starting ${INDEXER_NAME} indexer...`);
//     indexerStats.status = 'starting';
//     indexerStats.lastError = null;

//     // Build indexer first
//     fastify.log.info('Building indexer...');
//     const buildProcess = spawn('pnpm', ['run', 'build:indexer'], {
//       stdio: ['inherit', 'pipe', 'pipe'],
//       env: process.env
//     });

//     buildProcess.on('close', (buildCode) => {
//       if (buildCode === 0) {
//         fastify.log.info('Build successful, starting indexer process...');
        
//         // Start the actual indexer using the exact npm script
//         indexerProcess = spawn('pnpm', [
//           'run', 
//           `start:indexer:${INDEXER_TYPE}`
//         ], {
//           stdio: ['inherit', 'pipe', 'pipe'],
//           env: process.env
//         });

//         indexerStats.status = 'running';
//         indexerStats.pid = indexerProcess.pid || null;
        
//         fastify.log.info(`Indexer started with PID: ${indexerStats.pid}`);

//         // Handle indexer process events
//         indexerProcess.on('close', (code, signal) => {
//           fastify.log.warn(`Indexer process exited with code ${code}, signal: ${signal}`);
//           indexerStats.status = 'stopped';
//           indexerStats.pid = null;
          
//           // Auto-restart if process crashed (not manual shutdown)
//           if (code !== 0 && code !== null && signal !== 'SIGTERM') {
//             fastify.log.error(`Indexer crashed with code ${code}, restarting in 5 seconds...`);
//             indexerStats.restarts++;
//             indexerStats.lastRestart = new Date().toISOString();
//             indexerStats.lastError = `Process exited with code ${code}`;
            
//             setTimeout(() => startIndexer(), 5000);
//           }
//         });

//         indexerProcess.on('error', (err) => {
//           fastify.log.error(`Indexer process error: ${err.message}`);
//           indexerStats.status = 'error';
//           indexerStats.lastError = err.message;
//           indexerStats.restarts++;
//           indexerStats.lastRestart = new Date().toISOString();
          
//           // Retry after error
//           setTimeout(() => startIndexer(), 5000);
//         });

//         // Log indexer output
//         if (indexerProcess.stdout) {
//           indexerProcess.stdout.on('data', (data) => {
//             fastify.log.info(`[INDEXER] ${data.toString().trim()}`);
//           });
//         }

//         if (indexerProcess.stderr) {
//           indexerProcess.stderr.on('data', (data) => {
//             fastify.log.error(`[INDEXER ERROR] ${data.toString().trim()}`);
//           });
//         }

//       } else {
//         fastify.log.error(`Build failed with code ${buildCode}, retrying in 10 seconds...`);
//         indexerStats.status = 'build_failed';
//         indexerStats.lastError = `Build failed with code ${buildCode}`;
//         setTimeout(() => startIndexer(), 10000);
//       }
//     });

//     buildProcess.on('error', (err) => {
//       fastify.log.error(`Build process error: ${err.message}`);
//       indexerStats.status = 'build_error';
//       indexerStats.lastError = `Build error: ${err.message}`;
//       setTimeout(() => startIndexer(), 10000);
//     });

//   } catch (error) {
//     fastify.log.error(`Error starting indexer: ${error}`);
//     indexerStats.status = 'error';
//     indexerStats.lastError = error instanceof Error ? error.message : String(error);
//     setTimeout(() => startIndexer(), 10000);
//   }
// };

// // Restart indexer function
// const restartIndexer = () => {
//   if (indexerProcess) {
//     fastify.log.info('Stopping current indexer process...');
//     indexerStats.status = 'restarting';
//     indexerProcess.kill('SIGTERM');
//     indexerProcess = null;
//   }
  
//   setTimeout(() => startIndexer(), 2000);
// };

// // Graceful shutdown handler
// const gracefulShutdown = () => {
//   fastify.log.info('Shutting down gracefully...');
//   indexerStats.status = 'shutting_down';
  
//   if (indexerProcess) {
//     fastify.log.info('Terminating indexer process...');
//     indexerProcess.kill('SIGTERM');
    
//     // Force kill after 5 seconds if it doesn't exit gracefully
//     setTimeout(() => {
//       if (indexerProcess && !indexerProcess.killed) {
//         fastify.log.warn('Force killing indexer process...');
//         indexerProcess.kill('SIGKILL');
//       }
//     }, 5000);
//   }

//   // Close Fastify server
//   fastify.close(() => {
//     fastify.log.info('Health service shutdown complete');
//     process.exit(0);
//   });
// };

// // Register shutdown handlers
// process.on('SIGTERM', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);

// // Start the health service
// const start = async () => {
//   try {
//     // Start Fastify server
//     const address = await fastify.listen({
//       port: PORT,
//       host: '0.0.0.0'
//     });
    
//     fastify.log.info(`Health service for ${INDEXER_NAME} started at ${address}`);
    
//     // Start the indexer process
//     await startIndexer();
    
//   } catch (err:any) {
//     fastify.log.error('Error starting health service:', err);
//     process.exit(1);
//   }
// };

// // Start the application
// start();

import Fastify from 'fastify';
import { spawn, ChildProcess } from 'child_process';

const fastify = Fastify({
  logger: {
    level: 'info',
  }
});

// Get indexer type from command line arguments only
const INDEXER_TYPE = process.argv[2] || 'dapp';
const INDEXER_NAME = INDEXER_TYPE === 'dapp' ? 'MEDIALANO-DAPP' : 'MEDIALANO-MIPP';
const PORT = Number(process.env.PORT) || 3000;

let indexerProcess: ChildProcess | null = null;
let indexerStats = {
  status: 'initializing',
  startTime: new Date().toISOString(),
  restarts: 0,
  lastRestart: null as string | null,
  lastError: null as string | null,
  pid: null as number | null,
  lastHealthCheck: new Date().toISOString(),
  consecutiveFailures: 0
};

// Keep-alive timer to prevent Render from sleeping the service
let keepAliveTimer: NodeJS.Timeout;

// Health monitoring timer
let healthMonitorTimer: NodeJS.Timeout;

// Maximum consecutive failures before giving up
const MAX_CONSECUTIVE_FAILURES = 5;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const KEEP_ALIVE_INTERVAL = 60000; // 1 minute

// Self health check to keep service alive
const selfHealthCheck = async () => {
  try {
    indexerStats.lastHealthCheck = new Date().toISOString();
    
    // Check if indexer process is still running
    if (indexerProcess && indexerStats.status === 'running') {
      // Reset consecutive failures if process is running
      indexerStats.consecutiveFailures = 0;
      fastify.log.debug('Health check passed - indexer running');
    } else if (indexerStats.status === 'stopped' || indexerStats.status === 'error') {
      indexerStats.consecutiveFailures++;
      fastify.log.warn(`Health check failed - status: ${indexerStats.status}, failures: ${indexerStats.consecutiveFailures}`);
      
      // Restart if we have consecutive failures but haven't exceeded max attempts
      if (indexerStats.consecutiveFailures <= MAX_CONSECUTIVE_FAILURES) {
        fastify.log.info('Attempting automatic restart due to health check failure');
        await startIndexer();
      } else {
        fastify.log.error(`Max consecutive failures (${MAX_CONSECUTIVE_FAILURES}) reached. Manual intervention required.`);
        indexerStats.status = 'failed';
        indexerStats.lastError = `Max consecutive failures (${MAX_CONSECUTIVE_FAILURES}) reached`;
      }
    }
  } catch (error:any) {
    fastify.log.error('Health check error:', error);
    indexerStats.consecutiveFailures++;
  }
};

// Start periodic health monitoring
const startHealthMonitoring = () => {
  if (healthMonitorTimer) {
    clearInterval(healthMonitorTimer);
  }
  
  healthMonitorTimer = setInterval(selfHealthCheck, HEALTH_CHECK_INTERVAL);
  fastify.log.info('Health monitoring started');
};

// Keep-alive function to prevent service from sleeping
const keepAlive = () => {
  fastify.log.debug('Keep-alive heartbeat');
  // You could also make a self-request here if needed
};

// Start keep-alive timer
const startKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  
  keepAliveTimer = setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
  fastify.log.info('Keep-alive timer started');
};

// Health check route - enhanced
fastify.get('/', async (request, reply) => {
  // This endpoint hit resets consecutive failures
  if (indexerStats.consecutiveFailures > 0) {
    fastify.log.info('Manual health check - resetting failure count');
    indexerStats.consecutiveFailures = 0;
  }

  return {
    service: `${INDEXER_NAME}-deployment-service`,
    status: indexerStats.status,
    uptime: Math.floor(process.uptime()),
    indexer: {
      name: INDEXER_NAME,
      type: INDEXER_TYPE,
      pid: indexerStats.pid,
      status: indexerStats.status,
      restarts: indexerStats.restarts,
      startTime: indexerStats.startTime,
      lastRestart: indexerStats.lastRestart,
      lastError: indexerStats.lastError,
      lastHealthCheck: indexerStats.lastHealthCheck,
      consecutiveFailures: indexerStats.consecutiveFailures
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'production',
      contractAddress: process.env.CONTRACT_ADDRESS,
      startingBlock: process.env.STARTING_BLOCK,
      streamUrl: process.env.STREAM_URL,
      preset: 'sepolia'
    },
    timestamp: new Date().toISOString()
  };
});

// Detailed status route
fastify.get('/status', async (request, reply) => {
  return {
    ...indexerStats,
    uptime: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
    environment: process.env,
    config: {
      indexerName: INDEXER_NAME,
      indexerType: INDEXER_TYPE,
      port: PORT,
      healthCheckInterval: HEALTH_CHECK_INTERVAL,
      maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES
    }
  };
});

// Health check for load balancers - more robust
fastify.get('/health', async (request, reply) => {
  // Reset failure count when health endpoint is hit
  if (indexerStats.consecutiveFailures > 0) {
    fastify.log.info('Health endpoint hit - attempting recovery');
    indexerStats.consecutiveFailures = 0;
    
    // Try to restart if status is failed
    if (indexerStats.status === 'failed' || indexerStats.status === 'error') {
      startIndexer();
    }
  }

  if (indexerStats.status === 'running' || indexerStats.status === 'starting') {
    reply.code(200);
    return { 
      status: 'healthy', 
      indexer: indexerStats.status,
      consecutiveFailures: indexerStats.consecutiveFailures,
      lastHealthCheck: indexerStats.lastHealthCheck
    };
  } else if (indexerStats.status === 'failed' && indexerStats.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    reply.code(503);
    return { 
      status: 'failed', 
      indexer: indexerStats.status, 
      error: indexerStats.lastError,
      consecutiveFailures: indexerStats.consecutiveFailures,
      message: 'Service requires manual restart - consecutive failures exceeded'
    };
  } else {
    reply.code(503);
    return { 
      status: 'unhealthy', 
      indexer: indexerStats.status, 
      error: indexerStats.lastError,
      consecutiveFailures: indexerStats.consecutiveFailures
    };
  }
});

// Restart endpoint - enhanced
fastify.post('/restart', async (request, reply) => {
  fastify.log.info('Manual restart requested');
  indexerStats.consecutiveFailures = 0; // Reset failure count on manual restart
  restartIndexer();
  return { 
    message: 'Indexer restart initiated', 
    timestamp: new Date().toISOString(),
    consecutiveFailures: indexerStats.consecutiveFailures
  };
});

// Reset failures endpoint
fastify.post('/reset', async (request, reply) => {
  fastify.log.info('Manual reset requested');
  indexerStats.consecutiveFailures = 0;
  indexerStats.lastError = null;
  if (indexerStats.status === 'failed') {
    await startIndexer();
  }
  return { 
    message: 'Service reset initiated', 
    timestamp: new Date().toISOString(),
    status: indexerStats.status
  };
});

// Logs endpoint
fastify.get('/logs', async (request, reply) => {
  return {
    message: 'Logs endpoint - implement log storage if needed',
    indexer: INDEXER_NAME,
    status: indexerStats.status,
    lastRestart: indexerStats.lastRestart,
    lastHealthCheck: indexerStats.lastHealthCheck,
    consecutiveFailures: indexerStats.consecutiveFailures
  };
});

// Enhanced indexer starter with better error handling
const startIndexer = async () => {
  try {
    // Don't start if we've exceeded max failures
    if (indexerStats.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      fastify.log.error('Cannot start indexer - max consecutive failures reached');
      indexerStats.status = 'failed';
      return;
    }

    fastify.log.info(`Starting ${INDEXER_NAME} indexer... (attempt ${indexerStats.consecutiveFailures + 1})`);
    indexerStats.status = 'starting';
    indexerStats.lastError = null;

    // Clean up any existing process
    if (indexerProcess) {
      try {
        indexerProcess.kill('SIGTERM');
        indexerProcess = null;
      } catch (err:any) {
        fastify.log.warn('Error killing existing process:', err);
      }
    }

    // Build indexer with timeout
    fastify.log.info('Building indexer...');
    const buildProcess = spawn('pnpm', ['run', 'build:indexer'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env
    });

    // Set timeout for build process
    const buildTimeout = setTimeout(() => {
      fastify.log.error('Build process timeout, killing...');
      buildProcess.kill('SIGTERM');
    }, 300000); // 5 minutes timeout

    buildProcess.on('close', (buildCode) => {
      clearTimeout(buildTimeout);
      
      if (buildCode === 0) {
        fastify.log.info('Build successful, starting indexer process...');
        
        // Start the actual indexer using the exact npm script
        indexerProcess = spawn('pnpm', [
          'run', 
          `start:indexer:${INDEXER_TYPE}`
        ], {
          stdio: ['inherit', 'pipe', 'pipe'],
          env: process.env
        });

        indexerStats.status = 'running';
        indexerStats.pid = indexerProcess.pid || null;
        indexerStats.consecutiveFailures = 0; // Reset on successful start
        
        fastify.log.info(`Indexer started with PID: ${indexerStats.pid}`);

        // Handle indexer process events with better error tracking
        indexerProcess.on('close', (code, signal) => {
          fastify.log.warn(`Indexer process exited with code ${code}, signal: ${signal}`);
          indexerStats.status = 'stopped';
          indexerStats.pid = null;
          
          // Auto-restart if process crashed (not manual shutdown)
          if (code !== 0 && code !== null && signal !== 'SIGTERM' && signal !== 'SIGINT') {
            indexerStats.consecutiveFailures++;
            indexerStats.restarts++;
            indexerStats.lastRestart = new Date().toISOString();
            indexerStats.lastError = `Process exited with code ${code}, signal: ${signal}`;
            
            if (indexerStats.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
              fastify.log.error(`Indexer crashed (${indexerStats.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}), restarting in 5 seconds...`);
              setTimeout(() => startIndexer(), 5000);
            } else {
              fastify.log.error(`Max consecutive failures reached, marking as failed`);
              indexerStats.status = 'failed';
            }
          }
        });

        indexerProcess.on('error', (err) => {
          fastify.log.error(`Indexer process error: ${err.message}`);
          indexerStats.status = 'error';
          indexerStats.lastError = err.message;
          indexerStats.consecutiveFailures++;
          indexerStats.restarts++;
          indexerStats.lastRestart = new Date().toISOString();
          
          // Retry after error if under limit
          if (indexerStats.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
            setTimeout(() => startIndexer(), 5000);
          } else {
            indexerStats.status = 'failed';
          }
        });

        // Log indexer output with better formatting
        if (indexerProcess.stdout) {
          indexerProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
              fastify.log.info(`[INDEXER] ${output}`);
            }
          });
        }

        if (indexerProcess.stderr) {
          indexerProcess.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
              fastify.log.error(`[INDEXER ERROR] ${output}`);
            }
          });
        }

      } else {
        indexerStats.consecutiveFailures++;
        indexerStats.lastError = `Build failed with code ${buildCode}`;
        
        if (indexerStats.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
          fastify.log.error(`Build failed (${indexerStats.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}) with code ${buildCode}, retrying in 10 seconds...`);
          indexerStats.status = 'build_failed';
          setTimeout(() => startIndexer(), 10000);
        } else {
          fastify.log.error(`Build failed too many times, marking as failed`);
          indexerStats.status = 'failed';
        }
      }
    });

    buildProcess.on('error', (err) => {
      clearTimeout(buildTimeout);
      indexerStats.consecutiveFailures++;
      indexerStats.lastError = `Build error: ${err.message}`;
      
      if (indexerStats.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
        fastify.log.error(`Build process error (${indexerStats.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${err.message}`);
        indexerStats.status = 'build_error';
        setTimeout(() => startIndexer(), 10000);
      } else {
        fastify.log.error(`Too many build errors, marking as failed`);
        indexerStats.status = 'failed';
      }
    });

  } catch (error) {
    indexerStats.consecutiveFailures++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    indexerStats.lastError = errorMsg;
    
    if (indexerStats.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      fastify.log.error(`Error starting indexer (${indexerStats.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${errorMsg}`);
      indexerStats.status = 'error';
      setTimeout(() => startIndexer(), 10000);
    } else {
      fastify.log.error(`Too many errors, marking as failed`);
      indexerStats.status = 'failed';
    }
  }
};

// Restart indexer function
const restartIndexer = () => {
  indexerStats.consecutiveFailures = 0; // Reset failures on manual restart
  
  if (indexerProcess) {
    fastify.log.info('Stopping current indexer process...');
    indexerStats.status = 'restarting';
    try {
      indexerProcess.kill('SIGTERM');
    } catch (err:any) {
      fastify.log.warn('Error during process termination:', err);
    }
    indexerProcess = null;
  }
  
  setTimeout(() => startIndexer(), 2000);
};

// Enhanced graceful shutdown handler
const gracefulShutdown = () => {
  fastify.log.info('Shutting down gracefully...');
  indexerStats.status = 'shutting_down';
  
  // Clear timers
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  if (healthMonitorTimer) {
    clearInterval(healthMonitorTimer);
  }
  
  if (indexerProcess) {
    fastify.log.info('Terminating indexer process...');
    try {
      indexerProcess.kill('SIGTERM');
    } catch (err:any) {
      fastify.log.warn('Error during shutdown:', err);
    }
    
    // Force kill after 5 seconds if it doesn't exit gracefully
    setTimeout(() => {
      if (indexerProcess && !indexerProcess.killed) {
        fastify.log.warn('Force killing indexer process...');
        try {
          indexerProcess.kill('SIGKILL');
        } catch (err:any) {
          fastify.log.warn('Error during force kill:', err);
        }
      }
    }, 5000);
  }

  // Close Fastify server
  fastify.close(() => {
    fastify.log.info('Health service shutdown complete');
    process.exit(0);
  });
};

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // For nodemon restarts

// Handle uncaught exceptions
process.on('uncaughtException', (err:any) => {
  fastify.log.fatal('Uncaught exception:', err);
  indexerStats.status = 'crashed';
  indexerStats.lastError = `Uncaught exception: ${err.message}`;
  gracefulShutdown();
});

process.on('unhandledRejection', (reason:string, promise:any) => {
  fastify.log.error('Unhandled rejection at:');
  indexerStats.consecutiveFailures++;
  indexerStats.lastError = `Unhandled rejection: ${reason}`;
});

// Start the application
const start = async () => {
  try {
    // Start Fastify server
    const address = await fastify.listen({
      port: PORT,
      host: '0.0.0.0'
    });
    
    fastify.log.info(`Health service for ${INDEXER_NAME} started at ${address}`);
    
    // Start monitoring and keep-alive
    startHealthMonitoring();
    startKeepAlive();
    
    // Start the indexer process
    await startIndexer();
    
  } catch (err: any) {
    fastify.log.error('Error starting health service:', err);
    process.exit(1);
  }
};

// Start the application
start();