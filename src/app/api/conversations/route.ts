import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/conversations — list all conversations
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ conversations: [] });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, subject, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data });
}

// POST /api/conversations — create or update a conversation
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ conversation: null });
  }

  const supabase = getSupabase();
  const body = await req.json();
  const { id, title, subject, messages } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      { id, title, subject, messages },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

// DELETE /api/conversations?id=xxx
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const supabase = getSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
