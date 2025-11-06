const { spawn } = require('child_process');
const path = require('path');

function startApi() {
  console.log('Starting Laravel API server...');
  
  const apiPath = path.join(__dirname, '..', 'task-tracker-api');
  
  // Laravel 12'deki log parse hatasını önlemek için output'u filtrele
  const phpProcess = spawn('php', ['artisan', 'serve', '--host=0.0.0.0', '--port=8000'], {
    cwd: apiPath,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Stdout'u filtrele ve sadece önemli mesajları göster
  phpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // Sadece önemli mesajları göster (port bilgisi, hata mesajları)
    if (output.includes('Server running') || output.includes('Laravel') || output.includes('ERROR') || output.includes('Exception')) {
      process.stdout.write(output);
    }
  });

  // Stderr'u göster
  phpProcess.stderr.on('data', (data) => {
    const output = data.toString();
    // "849 Closing" gibi parse hatalarını filtrele
    if (!output.includes('Failed to extract the request port') && !output.includes('849 Closing')) {
      process.stderr.write(output);
    }
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
