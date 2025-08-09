# Deployment Guide

## Heroku Deployment

### Prerequisites
- Heroku CLI installed
- Git repository initialized
- Heroku account connected to your CLI

### Initial Deployment

1. **Create Heroku App**
   ```bash
   heroku create bobbys-coin-flip
   ```

2. **Set Environment Variables** (optional)
   ```bash
   heroku config:set SESSION_SECRET=your-secret-key-here
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

4. **Open Application**
   ```bash
   heroku open
   ```

### Environment Variables

- `SESSION_SECRET`: Secret key for session encryption (optional, has default)
- `PORT`: Port number (automatically set by Heroku)

### Files Required for Heroku

- `Procfile`: Defines how to run the app
- `package.json`: Contains start script and Node.js version
- Node.js version specified in engines field

### Monitoring

```bash
# View logs
heroku logs --tail

# Check app status
heroku ps

# Scale dynos
heroku ps:scale web=1
```

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   # or
   npm run dev
   ```

3. **Access Application**
   - Open browser to `http://localhost:3000`

## Production Considerations

### Database Migration
- Current setup uses in-memory storage
- For production, consider migrating to PostgreSQL:
  ```bash
  heroku addons:create heroku-postgresql:hobby-dev
  ```

### Security Enhancements
- Set strong SESSION_SECRET in production
- Implement rate limiting
- Add CSRF protection
- Use HTTPS (handled by Heroku)

### Performance Optimizations
- Enable gzip compression
- Implement caching headers
- Minify CSS/JS assets
- Use CDN for static assets

### Monitoring & Analytics
- Add error tracking (Sentry)
- Implement application metrics
- Set up uptime monitoring
- Add Google Analytics