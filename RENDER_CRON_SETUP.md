# Keep-Alive Setup for Render Backend

To keep the backend awake and prevent cold starts, use a free external cron service:

## Using cron-job.org (Free)

1. Go to https://cron-job.org
2. Create a free account
3. Click "Create new cron job"
4. Configure:
   - Title: `wedding-backend-keep-alive`
   - URL: `https://wedding-backend-6g10.onrender.com/health`
   - Schedule: Every 10 minutes
   - Save
5. The cron job will ping the health endpoint every 10 minutes to keep the backend awake

## Health Endpoint

The backend has a `/health` endpoint that returns:
```json
{
  "status": "ok",
  "timestamp": "2026-06-29T21:30:00.000Z"
}
```

This prevents the backend from going to sleep and eliminates cold start delays during uploads.
