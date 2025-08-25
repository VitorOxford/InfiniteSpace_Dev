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
    const { data, error } = await supabase.auth.signUp(credentials)
    if (error) throw error
    user.value = data.user
    return data
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
        // Adiciona um parâmetro de cache ao URL ao carregar para garantir que a imagem mais recente seja exibida
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

    // Garante que guardamos o URL limpo (sem o parâmetro de cache) na base de dados
    if (profileData.avatar_url) {
      profileData.avatar_url = profileData.avatar_url.split('?')[0]
    }

    const { email, ...updateData } = profileData
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.value.id)

    if (error) throw error

    // Atualiza o estado local com um novo parâmetro de cache para reatividade imediata
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

    // A opção 'upsert: true' substitui o ficheiro se ele já existir, o que é perfeito para um avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Obtém o URL público permanente do ficheiro
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

    // Atualiza o perfil do utilizador com o novo URL
    await updateProfile({ avatar_url: data.publicUrl })

    // Retorna o URL com o parâmetro de cache para a UI atualizar imediatamente
    return `${data.publicUrl}?t=${new Date().getTime()}`
  }

  // Função para controlar o estado do loading
  function setAuthenticating(status) {
    isAuthenticating.value = status
  }

  onMounted(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    if (currentSession) {
      session.value = currentSession
      user.value = currentSession.user
      await fetchProfile()
    }

    supabase.auth.onAuthStateChange(async (_, _session) => {
      session.value = _session
      user.value = _session?.user ?? null
      if (user.value) {
        await fetchProfile()
      } else {
        profile.value = null
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
