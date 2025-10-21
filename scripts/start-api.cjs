const { spawn } = require('child_process');
const path = require('path');

function startApi() {
  console.log('Starting Laravel API server...');
  
  const apiPath = path.join(__dirname, '..', 'task-tracker-api');
  const phpProcess = spawn('php', ['artisan', 'serve', '--host=0.0.0.0', '--port=8000'], {
    cwd: apiPath,
    stdio: 'inherit'
  });

  phpProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`API server crashed with code ${code}, restarting in 3 seconds...`);
      setTimeout(() => {
        startApi();
      }, 3000);
    }
  });

  phpProcess.on('error', (err) => {
    console.error('Failed to start API server:', err);
    setTimeout(() => {
      startApi();
    }, 3000);
  });
}

startApi();
