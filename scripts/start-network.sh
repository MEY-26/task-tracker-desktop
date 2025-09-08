#!/bin/bash

echo "Starting Task Tracker for Network Access..."
echo

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "Your local IP address is: $LOCAL_IP"
echo
echo "Frontend will be available at:"
echo "  http://localhost:5173"
echo "  http://$LOCAL_IP:5173"
echo
echo "Backend API will be available at:"
echo "  http://localhost:8000"
echo "  http://$LOCAL_IP:8000"
echo

# Start Laravel API server
echo "Starting Laravel API server..."
cd "$(dirname "$0")/../task-tracker-api"
php artisan serve --host=0.0.0.0 --port=8000 &
LARAVEL_PID=$!

# Wait a moment for Laravel to start
sleep 3

# Start Vite development server
echo "Starting Vite development server..."
cd "$(dirname "$0")/.."
npm run dev:network &
VITE_PID=$!

echo
echo "Both servers are starting..."
echo "You can access the application from other devices using:"
echo "  http://$LOCAL_IP:5173"
echo
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $LARAVEL_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
