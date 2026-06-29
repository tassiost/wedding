# Render Cron Job Setup for Keep-Alive

To keep the backend awake, set up a Render Cron Job:

## Option 1: Use Render Cron Job Service

1. Go to Render Dashboard
2. Click "New +" → "Cron Job"
3. Name: `wedding-backend-keep-alive`
4. Command: `curl -f https://wedding-backend-6g10.onrender.com/health`
5. Schedule: `*/10 * * * *` (every 10 minutes)
6. Click "Create Cron Job"

## Option 2: Use External Service

Use a free service like cron-job.org:
1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - URL: https://wedding-backend-6g10.onrender.com/health
   - Schedule: Every 10 minutes
4. Save

## Health Endpoint

The backend now has a `/health` endpoint that returns:
```json
{
  "status": "ok",
  "timestamp": "2026-06-29T21:30:00.000Z"
}
```

This keeps the backend awake and prevents cold starts during uploads.
