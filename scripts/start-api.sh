#!/bin/bash
cd "$(dirname "$0")/../task-tracker-api"

restart() {
    echo "Starting Laravel API server..."
    php artisan serve --host=0.0.0.0 --port=8000
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        echo "API server crashed, restarting in 3 seconds..."
        sleep 3
        restart
    fi
}

restart
