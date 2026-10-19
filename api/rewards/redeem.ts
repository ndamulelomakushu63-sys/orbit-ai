import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ptpnvrgzdnawvvxrkkid.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  const PRO_REDEMPTION_COST = 100;

  try {
    const { data: balanceRecord } = await supabase
      .from('reward_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentCredits = Number(balanceRecord?.total_earnings || 0);
    if (currentCredits < PRO_REDEMPTION_COST) {
      return res.status(400).json({
        error: `Insufficient Orbit Credits. You have ${currentCredits} credits, but ${PRO_REDEMPTION_COST} credits are required to redeem 1 Month of Orbit Pro.`
      });
    }

    const nextCredits = currentCredits - PRO_REDEMPTION_COST;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await supabase
      .from('reward_balances')
      .update({ total_earnings: nextCredits, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    await supabase
      .from('profiles')
      .update({
        plan: 'pro',
        subscription_status: 'pro_monthly',
        subscription_end: expiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return res.json({
      success: true,
      message: "Successfully redeemed 100 Orbit Credits for 1 Month of Orbit Pro!",
      remainingCredits: nextCredits,
      plan: "pro",
      subscriptionEnd: expiryDate.toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to redeem credits." });
  }
}
