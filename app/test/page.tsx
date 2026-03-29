import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('movies').select('count')
    
    if (error) {
      return <div>Error: {error.message}</div>
    }
    
    return <div>Success! Movies count: {JSON.stringify(data)}</div>
  } catch (err: any) {
    return <div>Error: {err.message}</div>
  }
}