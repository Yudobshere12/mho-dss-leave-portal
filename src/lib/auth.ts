/**
 * Authentication service stub
 * Supabase Auth integration is planned for later phase.
 */
export async function signIn(
  _email: string,
  _password: string,
  _remember?: boolean
): Promise<{ user: { email: string } }> {
  // Simulate minimal network delay
  await new Promise((resolve) => setTimeout(resolve, 600))
  throw new Error('Auth not implemented yet')
}
