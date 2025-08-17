<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin kullanıcı
        User::create([
            'name' => 'Mehmet Emin Yaman',
            'email' => 'admin@vaden.com.tr',
            'password' => Hash::make('1234'),
            'role' => 'admin',
        ]);

        // Readonly kullanıcı
        User::create([
            'name' => 'Sadece Görüntüleyici',
            'email' => 'readonly@example.com',
            'password' => Hash::make('1234'),
            'role' => 'observer',
        ]);

        // Normal kullanıcı
        User::create([
            'name' => 'Normal Kullanıcı',
            'email' => 'user@example.com',
            'password' => Hash::make('1234'),
            'role' => 'team_leader',
        ]);

        User::create([
            'name' => 'İzleyici Kullanıcı',
            'email' => 'izleyici@example.com',
            'password' => Hash::make('1234'),
            'role' => 'team_member'
        ]);
    }
}
