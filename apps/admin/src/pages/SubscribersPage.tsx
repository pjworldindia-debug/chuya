import { useQuery } from '@tanstack/react-query'
import { supabase } from '@chuya/shared/supabase'
import { formatDate } from '@chuya/shared/constants'

export default function SubscribersPage() {
  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['admin', 'subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscribers').select('*').order('subscribed_at', { ascending: false })
      if (error) throw error
      return data as { email: string; subscribed_at: string }[]
    },
  })

  return (
    <div id="subscribers-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
        <div className="text-sm text-gray-500">
          {subscribers?.length || 0} Total
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email Address</th>
              <th>Subscribed At</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={2} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : !subscribers?.length ? (
              <tr><td colSpan={2} className="text-center py-8 text-gray-400">No subscribers yet</td></tr>
            ) : subscribers.map((sub) => (
              <tr key={sub.email}>
                <td className="font-medium">{sub.email}</td>
                <td className="text-gray-500">{formatDate(sub.subscribed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
