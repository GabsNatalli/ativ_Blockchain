function getStorage() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch (err) {
    console.warn('Não foi possível acessar o localStorage para fotos de perfil.', err)
    return null
  }
}

export function getProfilePhotoStorageKey({ isAdmin, did, matricula }) {
  if (isAdmin) {
    return 'profilePhoto:admin'
  }
  if (did) {
    return `profilePhoto:user:${did}`
  }
  if (matricula) {
    return `profilePhoto:matricula:${matricula}`
  }
  return 'profilePhoto:anonymous'
}

export function loadProfilePhoto(context) {
  const storage = getStorage()
  if (!storage) return ''
  const key = getProfilePhotoStorageKey(context)
  try {
    if (context?.isAdmin) {
      return ''
    }
    return storage.getItem(key) || ''
  } catch (err) {
    console.warn('Erro ao carregar foto de perfil do localStorage.', err)
    return ''
  }
}

function emitProfilePhotoEvent(key, dataUrl) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return
  }

  try {
    const evento = new CustomEvent('profile-photo-updated', {
      detail: {
        key,
        dataUrl: typeof dataUrl === 'string' ? dataUrl : '',
      },
    })
    window.dispatchEvent(evento)
  } catch (err) {
    console.warn('Não foi possível emitir evento de atualização da foto de perfil.', err)
  }
}

export function saveProfilePhoto(context, dataUrl) {
  if (context?.isAdmin) {
    return
  }
  const storage = getStorage()
  if (!storage) return
  const key = getProfilePhotoStorageKey(context)
  try {
    if (dataUrl) {
      storage.setItem(key, dataUrl)
    } else {
      storage.removeItem(key)
    }
    emitProfilePhotoEvent(key, dataUrl || '')
  } catch (err) {
    console.warn('Erro ao salvar foto de perfil no localStorage.', err)
  }
}

export function removeProfilePhoto(context) {
  if (context?.isAdmin) {
    return
  }
  const storage = getStorage()
  if (!storage) return
  const key = getProfilePhotoStorageKey(context)
  try {
    storage.removeItem(key)
    emitProfilePhotoEvent(key, '')
  } catch (err) {
    console.warn('Erro ao remover foto de perfil do localStorage.', err)
  }
}
