# Environment Variables Setup Required

## ⚠️ Missing Environment Variables

You need to add the following environment variables to your `.env.local` file for integrations to work.

## Required Variables

### Google Integration
```env
GOOGLE_INTEGRATION_CLIENT_ID=your-google-integration-client-id.apps.googleusercontent.com
GOOGLE_INTEGRATION_CLIENT_SECRET=GOCSPX-your-google-integration-client-secret
```

**Note:** These are different from `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` which are used for user login.

### Slack Integration
```env
SLACK_CLIENT_ID=10194503395876.10175474174407
SLACK_CLIENT_SECRET=d775b74b1cf899741ddd3569b273ac0b
```

### GitHub Integration
```env
GITHUB_CLIENT_ID=Ov23liNKy1Oe3L83F2Yl
GITHUB_CLIENT_SECRET=1e8f4000b64f883fd1698fd32dfae4900ae5b47c
```

### Encryption Key (if not already set)
```env
INTEGRATION_ENCRYPTION_KEY=99508D1BD50A95C1035176EEAAA3814028FAB211A3D550F6F0996AA30DBE894C
```

## How to Add

1. Open your `.env.local` file in the root of your project
2. Add the variables above
3. Save the file
4. **Restart your development server** (`npm run dev`)

## Verification

After adding the variables and restarting, try connecting an integration again. The error should be resolved.

## For Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable above
4. Redeploy your application

## Important Notes

- **Never commit `.env.local` to Git** - it's already in `.gitignore`
- The Google integration credentials are **different** from login credentials
- All credentials are stored in `INTEGRATIONS_CREDENTIALS.md` (which is also gitignored)
- If you change the encryption key, all encrypted tokens will become unreadable

