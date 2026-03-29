'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Key, Search, History, Wallet, CreditCard, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgentPage() {
  const [movies, setMovies] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedMovie, setSelectedMovie] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [balance, setBalance] = useState(0)
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const router = useRouter()

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('roles, wallet_balance, pending_withdrawal, bank_account, bank_name, account_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserRoles(profile.roles || [])
      setBalance(profile.wallet_balance || 0)
      setPendingWithdrawal(profile.pending_withdrawal || 0)
      setBankAccount(profile.bank_account || '')
      setBankName(profile.bank_name || '')
      setAccountName(profile.account_name || '')
    }

    // Check if user is agent
    if (!profile?.roles?.includes('agent')) {
      toast.error('Agent access only')
      router.push('/profile')
      return
    }

    const { data: moviesData } = await supabase
      .from('movies')
      .select('id, title, price')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    setMovies(moviesData || [])

    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setTransactions(transactionsData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(search.toLowerCase())
  )

  const generateCode = async () => {
    if (!selectedMovie) {
      toast.error('Select a movie')
      return
    }

    const selectedMovieData = movies.find(m => m.id === selectedMovie)
    if (!selectedMovieData) return

    if (balance < selectedMovieData.price) {
      toast.error(`Insufficient balance. Need ₦${selectedMovieData.price}`)
      return
    }

    setGenerating(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const code = Math.floor(10000000 + Math.random() * 90000000).toString()

      await supabase.from('unlocks').insert({
        movie_id: selectedMovie,
        agent_id: user.id,
        amount: selectedMovieData.price,
        unlock_code: code,
        used: false,
      })

      const newBalance = balance - selectedMovieData.price
      await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'code_purchase',
        amount: -selectedMovieData.price,
        reference: `CODE_${code}`,
      })

      setBalance(newBalance)
      setGeneratedCode(code)
      toast.success(`Code generated: ${code}`)

      const { data: newTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setTransactions(newTransactions || [])

    } catch (error: any) {
      toast.error(error.message || 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  const saveBankDetails = async () => {
    if (!bankAccount || !bankName || !accountName) {
      toast.error('Please fill all bank details')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from('users')
      .update({
        bank_account: bankAccount,
        bank_name: bankName,
        account_name: accountName
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to save bank details')
    } else {
      toast.success('Bank details saved')
    }
  }

  const requestWithdrawal = async () => {
    const amount = parseInt(withdrawAmount)
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal is ₦100')
      return
    }

    const availableBalance = balance - pendingWithdrawal
    if (amount > availableBalance) {
      toast.error(`Insufficient balance. Available: ₦${availableBalance}`)
      return
    }

    if (!bankAccount || !bankName || !accountName) {
      toast.error('Please add bank details first')
      return
    }

    setWithdrawing(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not logged in')

      const newPending = pendingWithdrawal + amount
      const { error: updateError } = await supabase
        .from('users')
        .update({ pending_withdrawal: newPending })
        .eq('id', user.id)

      if (updateError) throw updateError

      await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: amount,
          bank_account: bankAccount,
          bank_name: bankName,
          account_name: accountName,
          status: 'pending'
        })

      setPendingWithdrawal(newPending)
      toast.success(`Withdrawal request submitted! ₦${amount} is pending approval.`)
      setShowWithdraw(false)
      setWithdrawAmount('')

    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="text-primary">Loading...</div>
      </div>
    )
  }

  const availableBalance = balance - pendingWithdrawal

  return (
    <div className="min-h-screen bg-dark pb-20">
      <div className="p-4 pt-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
        <p className="mb-6 text-gray-500">Generate codes & manage earnings</p>

        {/* Wallet Card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 p-6 border border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-400">Total Balance</p>
              <p className="text-3xl font-bold text-primary">₦{balance}</p>
            </div>
            <button
              onClick={() => setShowWithdraw(!showWithdraw)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black"
            >
              <Wallet className="h-4 w-4" />
              Withdraw
            </button>
          </div>
          
          {pendingWithdrawal > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-yellow-500">
              <Clock className="h-4 w-4" />
              <span>Pending withdrawal: ₦{pendingWithdrawal}</span>
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            Available to withdraw: ₦{availableBalance}
          </div>
          
          <p className="mt-2 text-xs text-gray-500">
            You earn 20% commission when your codes are used
          </p>
        </div>

        {/* Withdrawal Section */}
        {showWithdraw && (
          <div className="mb-6 rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Withdraw Funds
            </h2>

            <p className="mb-3 text-sm text-gray-400">
              Available balance: ₦{availableBalance}
            </p>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Account Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full rounded-xl bg-dark p-3 text-white"
              />
              <input
                type="text"
                placeholder="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-xl bg-dark p-3 text-white"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full rounded-xl bg-dark p-3 text-white"
              />
              <button
                onClick={saveBankDetails}
                className="w-full rounded-xl border border-primary py-2 text-sm font-bold text-primary"
              >
                Save Bank Details
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <input
                type="number"
                placeholder="Amount to withdraw (₦)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mb-3 w-full rounded-xl bg-dark p-3 text-white"
              />
              <button
                onClick={requestWithdrawal}
                disabled={withdrawing || !withdrawAmount || parseInt(withdrawAmount) > availableBalance}
                className="w-full rounded-xl bg-primary py-3 font-bold text-black disabled:opacity-50"
              >
                {withdrawing ? 'Processing...' : 'Request Withdrawal'}
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Minimum withdrawal: ₦100 • Funds are held until admin approval
              </p>
            </div>
          </div>
        )}

        {/* Generate Code Section */}
        <div className="mb-6 rounded-2xl bg-card p-6">
          <h2 className="mb-4 font-bold text-white">Generate Code</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-dark p-3 pl-10 text-white"
            />
          </div>

          <select
            value={selectedMovie}
            onChange={(e) => setSelectedMovie(e.target.value)}
            className="mb-4 w-full rounded-xl bg-dark p-3 text-white"
          >
            <option value="">Select a movie...</option>
            {filteredMovies.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title} - ₦{movie.price}
              </option>
            ))}
          </select>

          <button
            onClick={generateCode}
            disabled={generating || !selectedMovie || balance < (movies.find(m => m.id === selectedMovie)?.price || 0)}
            className="w-full rounded-xl bg-primary py-3 font-bold text-black disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Generate Code (₦${movies.find(m => m.id === selectedMovie)?.price || 0})`}
          </button>

          {generatedCode && (
            <div className="mt-4 rounded-xl border border-primary bg-primary/10 p-4 text-center">
              <p className="text-3xl font-bold text-primary">{generatedCode}</p>
              <p className="text-xs text-gray-500">Give this to your customer</p>
            </div>
          )}
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div className="rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-bold text-white">Recent Transactions</h2>
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between border-b border-border p-2">
                <span className="text-sm text-white">
                  {tx.type === 'code_purchase' ? 'Code Generated' : tx.type}
                </span>
                <span className={`font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {tx.amount < 0 ? `-₦${Math.abs(tx.amount)}` : `+₦${tx.amount}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav role={userRoles} />
    </div>
  )
}