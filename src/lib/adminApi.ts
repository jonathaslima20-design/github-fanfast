import { supabase } from './supabase';

/**
 * Update user email using admin privileges
 */
export async function updateUserEmailAdmin(userId: string, newEmail: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('update-user-email', {
    body: { userId, newEmail },
  });

  if (error) {
    // Extract detailed error message from Edge Function response
    let errorMessage = 'Erro ao atualizar email';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string' 
          ? JSON.parse(error.context.body) 
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Erro ao atualizar email');
  }
}

/**
 * Change user password using admin privileges
 */
export async function changeUserPassword(userId: string, newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('change-user-password', {
    body: { userId, newPassword },
  });

  if (error) {
    // Extract detailed error message from Edge Function response
    let errorMessage = 'Erro ao alterar senha';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string' 
          ? JSON.parse(error.context.body) 
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Erro ao alterar senha');
  }
}

/**
 * Reset user password using admin privileges (alias for changeUserPassword)
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  return changeUserPassword(userId, newPassword);
}

/**
 * Simple and efficient user cloning function
 * Clones user profile, categories, products, and images in one operation
 */
export async function cloneUserComplete(
  originalUserId: string,
  newUserData: {
    email: string;
    password: string;
    name: string;
    slug: string;
  }
): Promise<{ newUserId: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('clone-user', {
    body: { originalUserId, newUserData },
  });

  if (error) {
    // Extract detailed error message from Edge Function response
    let errorMessage = 'Erro ao clonar usuário';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string' 
          ? JSON.parse(error.context.body) 
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Erro ao clonar usuário');
  }

  return { newUserId: data.newUserId };
}

/**
 * Create a new user with admin privileges
 */
export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  whatsapp?: string;
  role: string;
}): Promise<{ userId: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: userData,
  });

  if (error) {
    let errorMessage = 'Erro ao criar usuário';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string'
          ? JSON.parse(error.context.body)
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.error || errorBody.message || errorMessage;
      } catch (parseError) {
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || data.error || 'Erro ao criar usuário');
  }

  return { userId: data.userId };
}