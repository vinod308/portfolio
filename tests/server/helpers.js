import { vi } from 'vitest'
import { readConfig } from '../../server/config.js'
import { createApp } from '../../server/app.js'

// Placeholder values only: the mock transport never connects anywhere.
export const TEST_SECRET = 'not-a-real-password-123'
export const baseEnv = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer@example.test',
  SMTP_PASS: TEST_SECRET,
  MAIL_FROM: 'Portfolio Contact <mailer@example.test>',
  MAIL_TO: 'vinodvinni308@gmail.com',
  CLIENT_ORIGIN: 'http://localhost:5173',
  SMTP_VERIFY_ON_START: 'false',
}

export const validBody = {
  firstName: 'Asha',
  lastName: 'Recruiter',
  email: 'asha@company.example',
  phone: '+91 98765 43210',
  message: 'Hello Vinod, we have a full stack role and would like to talk with you about it.',
  website: '',
  elapsedMs: 12000,
}

export function mockTransport(impl) {
  return {
    kind: 'mock',
    sendMail: vi.fn(
      impl ??
        (async (msg) => ({ messageId: '<test-id@example.test>', accepted: [msg.to], rejected: [] })),
    ),
  }
}

export function memoryLogger() {
  const lines = []
  const push = (level) => (o) => lines.push({ level, ...o })
  return { lines, info: push('info'), warn: push('warn'), error: push('error') }
}

export function makeApp({
  env = {},
  transport = mockTransport(),
  logger = memoryLogger(),
  verifyIdToken,
  adminStore,
  analyticsStore,
} = {}) {
  const config = readConfig({ ...baseEnv, ...env })
  const deps = {
    config,
    transport,
    logger,
    ...(verifyIdToken && { verifyIdToken }),
    ...(adminStore && { adminStore }),
    ...(analyticsStore && { analyticsStore }),
  }
  return { app: createApp(deps), transport, logger, config }
}
