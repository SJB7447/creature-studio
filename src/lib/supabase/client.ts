import { createClient } from '@supabase/supabase-js'
import type { Database } from './generated-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// 브라우저 전용 Supabase 클라이언트 (anon key — 읽기 전용 공개 데이터)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
