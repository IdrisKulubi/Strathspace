# Daily.co API Setup

The StrathSpeed video calling feature uses Daily.co for video calls. To set up:

## 1. Get Daily API Key

1. Go to [Daily.co](https://daily.co) and create an account
2. Navigate to your Dashboard
3. Go to Settings > API Keys
4. Copy your API key

## 2. Configure Environment Variable

1. Open `.env.local` file in the demo-site directory
2. Replace `your_daily_api_key_here` with your actual Daily API key:

```
DAILY_API_KEY=your_actual_api_key_here
```

## 3. Restart Development Server

After adding the API key, restart your Next.js development server:

```bash
pnpm dev
```

## Important Notes

- Keep your API key secure and never commit it to version control
- The API key is only accessible on the server-side for security
- Daily.co provides free tier with limited minutes for development/testing
- For production, consider upgrading to a paid plan based on your usage needs

## Troubleshooting

If you see "DAILY_API_KEY environment variable is required" error:

1. Verify the API key is correctly set in `.env.local`
2. Ensure no extra spaces around the key
3. Restart the development server
4. Check that `.env.local` is in the correct directory (demo-site root) 