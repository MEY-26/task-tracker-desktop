<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * Departman listesini config'den döndürür.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Yetkisiz'], 401);
        }

        $departments = config('departments', []);
        return response()->json(['departments' => $departments]);
    }
}
