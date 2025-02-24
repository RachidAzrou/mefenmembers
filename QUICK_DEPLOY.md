# Quick Free Deployment Guide

## 1. Firebase Setup (Free Forever)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project (skip Google Analytics)
3. Enable Authentication > Email/Password
4. Go to Project Settings > Web App (</>) 
5. Copy these values:
   ```
   apiKey
   projectId
   appId
   ```

## 2. Vercel Deploy (Free Forever)
1. Go to [Vercel](https://vercel.com)
2. Login with GitHub
3. Click "New Project" > Import your repo
4. Add Environment Variables:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
5. Deploy!
6. Copy your vercel URL (e.g. your-app.vercel.app)
7. Add it to Firebase Console > Authentication > Authorized Domains

## Free Tier Limits
- Firebase: 50k authentications/month, 1GB storage
- Vercel: 100GB bandwidth/month, unlimited deployments

Need help? Let me guide you through each step!
