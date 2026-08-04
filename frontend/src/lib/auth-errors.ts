type AuthError = { code?: string | undefined; message?: string | undefined } | null | undefined;

const messages: Record<string, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com este e-mail. Tente entrar.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha inválidos.",
  INVALID_PASSWORD: "Senha incorreta.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar. Enviamos o link para sua caixa de entrada.",
  PASSWORD_TOO_SHORT: "Escolha uma senha com pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha pode ter no máximo 128 caracteres.",
  USER_NOT_FOUND: "Não encontramos uma conta com este e-mail.",
  USER_EMAIL_NOT_FOUND: "Não encontramos uma conta com este e-mail.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Não encontramos uma conta com este e-mail.",
  INVALID_TOKEN: "Este link é inválido ou expirou. Solicite um novo.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre novamente.",
  FAILED_TO_CREATE_USER: "Não foi possível criar sua conta. Tente novamente.",
  FAILED_TO_CREATE_SESSION: "Não foi possível iniciar sua sessão. Tente novamente.",
};

export function authErrorMessage(error: AuthError, fallback = "Não foi possível concluir a ação. Tente novamente.") {
  if (!error) return fallback;
  return (error.code && messages[error.code]) || fallback;
}
