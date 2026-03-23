export {
  getResendApiKey,
  getResendDefaultFromName,
  sendResendEmail,
  ResendSendError,
  type SendResendEmailPayload,
  type SendResendEmailResult,
  type ResendErrorCode,
} from './resend';

export {
  buildAgentFromAddress,
  formatAgentResendFromHeader,
  isResendFromAddressUnique,
  normalizeResendDomain,
  normalizeResendFromEmail,
  sanitizeEmailLocalPart,
} from './agent-address';
