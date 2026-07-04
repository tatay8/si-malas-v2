import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Ambil Authorization Token dari header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token otorisasi diperlukan.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // Klien supabase biasa untuk memvalidasi token user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 });
    }

    // Periksa apakah user adalah admin
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya Admin yang dapat membuat akun.' }, { status: 403 });
    }

    // Baca data body
    const { username, fullName, password } = await req.json();
    if (!username || !fullName || !password) {
      return NextResponse.json({ error: 'Username, Nama Lengkap, dan Password harus diisi.' }, { status: 400 });
    }

    const email = `${username.trim().toLowerCase()}@simalas.local`;

    // Gunakan admin client untuk membuat user baru
    const supabaseAdmin = getSupabaseAdmin();
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username.trim().toLowerCase(),
        full_name: fullName,
        role: 'teacher'
      }
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Akun wali kelas berhasil dibuat.', user: newUser.user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
