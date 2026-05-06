import { supabase } from './supabaseClient'

export async function createAndSignInTestUser() {
  // create user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'test@mail.com',
    password: 'password123',
  })

  if (signUpError) {
    console.error('Supabase signUp error:', signUpError)
  } else {
    console.log('Signed up:', signUpData)
  }

  // sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@mail.com',
    password: 'password123',
  })

  if (signInError) {
    console.error('Supabase signIn error:', signInError)
  } else {
    console.log('Signed in:', signInData)
  }

  // get user
  const { data: userData, error: getUserError } = await supabase.auth.getUser()
  if (getUserError) {
    console.error('Supabase getUser error:', getUserError)
  } else {
    console.log('Current user:', userData)
  }

  return { signUpData, signUpError, signInData, signInError, userData, getUserError }
}

// If run directly with node (after replacing keys in supabaseClient and installing deps),
// you can run: `node src/lib/createTestUser.js` by adding a small wrapper or using a REPL.
