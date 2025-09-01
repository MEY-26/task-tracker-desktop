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
            'email' => 'meminyaman@vaden.com.tr',
            'password' => Hash::make('1234'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Okan Turanlı',
            'email' => 'okanturanli@vaden.com.tr',
            'password' => Hash::make('1234'),
            'role' => 'admin',
        ]);

        // Readonly kullanıcı
        User::create([
            'name' => 'Sadece Görüntüleyici',
            'email' => 'observer@example.com',
            'password' => Hash::make('1234'),
            'role' => 'observer',
        ]);

        // Normal kullanıcı
        User::create([
            'name' => 'Normal Kullanıcı',
            'email' => 'teamleader@example.com',
            'password' => Hash::make('1234'),
            'role' => 'team_leader',
        ]);

        User::create([
            'name' => 'İzleyici Kullanıcı',
            'email' => 'teammember@example.com',
            'password' => Hash::make('1234'),
            'role' => 'team_member'
        ]);
    }
}
