<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Osman Aydın',
            'email' => 'osmanaydin@vaden.com.tr',
            'password' => Hash::make('1234'),
            'role' => 'admin',
        ]);
        User::create([
            'name' => 'Okan Turanlı',
            'email' => 'okanturanli@vaden.com.tr',
            'password' => Hash::make('1234'),
            'role' => 'admin',
        ]);
        User::create([
            'name' => 'Mehmet Emin Yaman',
            'email' => 'meminyaman@vaden.com.tr',
            'password' => Hash::make('1234'),
            'role' => 'admin',
        ]);

        // Task types ve statuses için seeder çalıştır
        $this->call(TaskTypeSeeder::class);
    }
}
