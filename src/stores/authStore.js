// src/stores/authStore.js
import { defineStore } from 'pinia'
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const profile = ref(null)
  const isAuthenticating = ref(false) // Estado para controlar a tela de loading

  async function handleLogin(credentials) {
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    user.value = data.user
    await fetchProfile()
    return data
  }

  async function handleSignUp(credentials) {
    const { email, password, full_name, phone } = credentials;
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // CORREÇÃO: Redireciona para a página de login após o clique no link de confirmação.
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          full_name: full_name,
          phone: phone,
        }
      }
    });

    if (error) throw error;
    return data;
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
    profile.value = null
  }

  async function fetchProfile() {
    if (!user.value) return null
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select(
          `full_name, date_of_birth, address, phone, document_type, document_number, subscription_plan, avatar_url`,
        )
        .eq('id', user.value.id)
        .single()

      if (error && status !== 406) throw error

      if (data) {
        if (data.avatar_url) {
          data.avatar_url = `${data.avatar_url.split('?')[0]}?t=${new Date().getTime()}`
        }
        profile.value = { ...data, email: user.value.email }
      }
      return profile.value
    } catch (error) {
      console.error('Erro ao buscar perfil:', error.message)
      return null
    }
  }

  async function updateProfile(profileData) {
    if (!user.value) throw new Error('Utilizador não autenticado')

    if (profileData.avatar_url) {
      profileData.avatar_url = profileData.avatar_url.split('?')[0]
    }

    const { email, ...updateData } = profileData
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.value.id)

    if (error) throw error

    const updatedProfileData = { ...profile.value, ...updateData }
    if (updatedProfileData.avatar_url) {
      updatedProfileData.avatar_url = `${updatedProfileData.avatar_url.split('?')[0]}?t=${new Date().getTime()}`
    }
    profile.value = updatedProfileData
  }

  async function uploadAvatar(file) {
    if (!user.value) throw new Error('Utilizador não autenticado')
    if (!file) throw new Error('Nenhum ficheiro selecionado')

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.value.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

    await updateProfile({ avatar_url: data.publicUrl })

    return `${data.publicUrl}?t=${new Date().getTime()}`
  }

  function setAuthenticating(status) {
    isAuthenticating.value = status
  }

  onMounted(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    if (currentSession && currentSession.user && currentSession.user.email_confirmed_at) {
      session.value = currentSession
      user.value = currentSession.user
      await fetchProfile()
    }

    supabase.auth.onAuthStateChange(async (_, _session) => {
      session.value = _session
      user.value = _session?.user ?? null

      // CORREÇÃO: Verifica se o email do usuário na sessão foi confirmado
      const isEmailConfirmed = user.value && user.value.email_confirmed_at;

      if (user.value && isEmailConfirmed) {
        // Apenas busca o perfil se o usuário existir e o e-mail estiver confirmado
        await fetchProfile()
      } else {
        // Caso contrário, garante que o perfil esteja limpo
        profile.value = null
        // E se houver um usuário sem e-mail confirmado, remove a sessão temporária
        if (user.value) {
          await supabase.auth.signOut();
        }
      }
    })
  })

  return {
    user,
    session,
    profile,
    isAuthenticating,
    setAuthenticating,
    handleLogin,
    handleSignUp,
    handleLogout,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  }
})
