 # Vyuha Esports - Complete Self-Hosting Deployment Guide
 
 Yeh guide step-by-step batayegi kaise Vyuha Esports ko apne Supabase account aur Vercel pe deploy karna hai.
 
 ---
 
 ## 📋 Prerequisites (Zaruratein)
 
 - GitHub account (free)
 - Supabase account (free tier works) - [supabase.com](https://supabase.com)
 - Vercel account (free tier works) - [vercel.com](https://vercel.com)
 - VS Code installed (ya GitHub Codespaces use karo tablet ke liye)
 - Node.js installed (v18+)
 
 ---
 
 # 🗄️ STEP 1: Supabase Project Setup
 
 ## 1.1 Create Supabase Project
 
 1. Go to [supabase.com](https://supabase.com) → Sign Up/Login
 2. Click **"New Project"** (green button)
 3. Fill details:
    - **Organization**: Select or create one
    - **Project name**: `vyuha-esports`
    - **Database Password**: Strong password (SAVE THIS!)
    - **Region**: Select closest to your users (e.g., Mumbai)
 4. Click **"Create new project"** → Wait 2-3 minutes
 
 ## 1.2 Get Your Supabase Credentials
 
 Jab project ready ho jaye:
 
 1. Go to **Settings** (gear icon left sidebar)
 2. Click **"API"** section
 3. Note down these values:
 
 | Credential | Kaha Milega | Kya Hai |
 |------------|-------------|---------|
 | **Project URL** | Project URL field | `https://xxxx.supabase.co` |
 | **anon public key** | anon key (public) | Frontend ke liye |
 | **service_role key** | service_role key (SECRET!) | Edge functions ke liye - SHARE MAT KARO! |
 | **Project Reference ID** | URL mein `xxxx` part | e.g., `drwxtjgtjejwegsneutq` |
 
 ---
 
 # 🔑 STEP 2: Supabase Access Token Banana
 
 Edge functions deploy karne ke liye Access Token chahiye:
 
 1. Go to [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
 2. Click **"Generate new token"**
 3. Name: `vyuha-deploy` (kuch bhi)
 4. Click **"Generate Token"**
 5. **COPY karke SAVE karo** - sirf ek baar dikhega!
 
 ⚠️ **IMPORTANT**: Yeh token dobara nahi dikhega, kahin safe jagah save karo!
 
 ---
 
 # 🔐 STEP 3: Supabase Secrets Add Karna
 
 ## 3.1 Dashboard Se Secrets Add Karo
 
 1. Go to Supabase Dashboard → **Project Settings** (gear icon)
 2. Click **"Edge Functions"** (left sidebar)
 3. Click **"Manage Secrets"** button
 4. Add these secrets one by one:
 
 | Secret Name | Value Kahan Se Milega |
 |-------------|----------------------|
 | `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) → API Keys → Create |
 | `ONESIGNAL_APP_ID` | [onesignal.com](https://onesignal.com) → Your App → Settings → Keys & IDs |
 | `ONESIGNAL_REST_API_KEY` | OneSignal → Settings → Keys & IDs → REST API Key |
 
 ### DeepSeek API Key Kaise Banaye:
 1. Go to [platform.deepseek.com](https://platform.deepseek.com)
 2. Sign up/Login
 3. Go to **API Keys** section
 4. Click **"Create API Key"**
 5. Copy the key (starts with `sk-`)
 
 ### OneSignal Setup:
 1. Go to [onesignal.com](https://onesignal.com)
 2. Create account → Create new app
 3. Select **"Web"** platform
 4. Follow setup wizard
 5. Go to **Settings → Keys & IDs**
 6. Copy **OneSignal App ID** and **REST API Key**
 
 ---
 
 # 💳 STEP 4: ZapUPI Payment Setup
 
 ZapUPI credentials database mein store hote hain:
 
 1. Go to Supabase Dashboard → **SQL Editor** (left sidebar)
 2. Click **"New Query"**
 3. Paste this SQL (apne credentials daalo):
 
 ```sql
 INSERT INTO payment_gateway_config (gateway_name, display_name, api_key_id, api_key_secret, is_enabled)
 VALUES ('zapupi', 'ZapUPI', 'YOUR_ZAPUPI_TOKEN', 'YOUR_ZAPUPI_SECRET', true)
 ON CONFLICT (gateway_name) 
 DO UPDATE SET api_key_id = EXCLUDED.api_key_id, api_key_secret = EXCLUDED.api_key_secret, is_enabled = true;
 ```
 
 4. Replace `YOUR_ZAPUPI_TOKEN` and `YOUR_ZAPUPI_SECRET` with your actual ZapUPI credentials
 5. Click **"Run"** (green button)
 
 ### ZapUPI Credentials Kahan Se Milenge:
 1. Go to [zapupi.com](https://zapupi.com)
 2. Login to merchant dashboard
 3. Go to **API Settings** or **Integration**
 4. Copy **Token** and **Secret Key**
 
 ---
 
 # 💻 STEP 5: VS Code Terminal Se Deploy
 
 ## 5.1 Repository Clone Karo
 
 Terminal open karo (VS Code mein `Ctrl+`` ya `View → Terminal`):
 
 ```bash
 # Clone repository
 git clone https://github.com/YOUR_USERNAME/vyuha-esports.git
 
 # Folder mein jao
 cd vyuha-esports
 
 # Dependencies install karo
 npm install
 ```
 
 ## 5.2 Supabase CLI Login
 
 ```bash
 # Supabase CLI login (browser open hoga)
 npx supabase login
 ```
 
 Browser mein Supabase login page khulega. Login karo aur authorize karo.
 
 ## 5.3 Project Link Karo
 
 ```bash
 # Apna Project ID daalo (jo Step 1.2 mein note kiya)
 npx supabase link --project-ref YOUR_PROJECT_ID
 ```
 
 Example:
 ```bash
 npx supabase link --project-ref drwxtjgtjejwegsneutq
 ```
 
 ## 5.4 Database Migrations Push Karo
 
 ```bash
 # Saare tables aur policies database mein create hojayenge
 npx supabase db push
 ```
 
 Type `y` and press Enter jab confirmation maange.
 
 ## 5.5 Edge Functions Deploy Karo
 
 ```bash
 # Saare edge functions deploy karo
 npx supabase functions deploy
 ```
 
 Ya specific function deploy karo:
 ```bash
 npx supabase functions deploy zapupi-create-order
 npx supabase functions deploy zapupi-webhook
 npx supabase functions deploy ai-chat
 npx supabase functions deploy send-push-notification
 ```
 
 ## 5.6 Secrets CLI Se Add Karo (Alternative Method)
 
 Agar dashboard se nahi kiya, terminal se bhi kar sakte ho:
 
 ```bash
 # DeepSeek API Key
 npx supabase secrets set DEEPSEEK_API_KEY=sk-your-deepseek-key-here
 
 # OneSignal App ID
 npx supabase secrets set ONESIGNAL_APP_ID=your-onesignal-app-id
 
 # OneSignal REST API Key
 npx supabase secrets set ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
 ```
 
 ---
 
 # 🌐 STEP 6: Vercel Deployment
 
 ## 6.1 GitHub Pe Push Karo
 
 Agar changes kiye hain:
 ```bash
 git add .
 git commit -m "Ready for deployment"
 git push origin main
 ```
 
 ## 6.2 Vercel Pe Import Karo
 
 1. Go to [vercel.com](https://vercel.com) → Login with GitHub
 2. Click **"Add New..."** → **"Project"**
 3. Select your `vyuha-esports` repository
 4. **Framework Preset**: Vite (auto-detect hona chahiye)
 5. **Build Command**: `npm run build`
 6. **Output Directory**: `dist`
 
 ## 6.3 Environment Variables Add Karo
 
 Vercel project settings mein:
 
 1. Go to **Settings** → **Environment Variables**
 2. Add these variables:
 
 | Name | Value |
 |------|-------|
 | `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
 | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon key (long string) |
 | `VITE_SUPABASE_PROJECT_ID` | Your project ID (e.g., `drwxtjgtjejwegsneutq`) |
 | `VITE_ONESIGNAL_APP_ID` | Your OneSignal App ID |
 
 3. Click **"Save"** for each variable
 
 ## 6.4 Deploy Karo
 
 1. Click **"Deploy"** button
 2. Wait 2-3 minutes for build
 3. Done! Your app is live! 🎉
 
 ---
 
 # 🔗 STEP 7: Webhooks Configure Karo
 
 ## ZapUPI Webhook
 
 1. Go to ZapUPI Dashboard → **Settings** → **Webhooks**
 2. Add this URL:
 ```
 https://YOUR_PROJECT_ID.supabase.co/functions/v1/zapupi-webhook
 ```
 3. Example:
 ```
 https://drwxtjgtjejwegsneutq.supabase.co/functions/v1/zapupi-webhook
 ```
 4. Save the webhook
 
 ---
 
 # ✅ STEP 8: Verify Everything Works
 
 1. Open your deployed app URL
 2. Go to `/admin/backend-status`
 3. Login as admin
 4. Click **"Run All Checks"**
 5. All should show **green ✓**
 
 ---
 
 # 📋 Quick Command Reference (Copy-Paste Ready)
 
 ```bash
 # ===== FULL DEPLOYMENT SEQUENCE =====
 
 # 1. Clone and setup
 git clone https://github.com/YOUR_USERNAME/vyuha-esports.git
 cd vyuha-esports
 npm install
 
 # 2. Supabase login
 npx supabase login
 
 # 3. Link project (apna PROJECT_ID daalo)
 npx supabase link --project-ref YOUR_PROJECT_ID
 
 # 4. Push database
 npx supabase db push
 
 # 5. Deploy functions
 npx supabase functions deploy
 
 # 6. Set secrets (optional - dashboard se bhi ho sakta hai)
 npx supabase secrets set DEEPSEEK_API_KEY=sk-xxxxx
 npx supabase secrets set ONESIGNAL_APP_ID=xxxxx
 npx supabase secrets set ONESIGNAL_REST_API_KEY=xxxxx
 
 # 7. Push to GitHub
 git add .
 git commit -m "Deployment ready"
 git push origin main
 ```
 
 ---
 
 # 🛠️ Troubleshooting
 
 ## "Command not found: supabase"
 ```bash
 # Use npx instead
 npx supabase login
 ```
 
 ## "Project not linked"
 ```bash
 npx supabase link --project-ref YOUR_PROJECT_ID
 ```
 
 ## "Functions not deployed"
 ```bash
 npx supabase functions deploy --project-ref YOUR_PROJECT_ID
 ```
 
 ## "Database migrations failed"
 ```bash
 # Check status
 npx supabase db remote commit
 
 # Force push
 npx supabase db push --include-all
 ```
 
 ## Vercel "Page not found" on refresh
 Already fixed with `vercel.json` in project root.
 
 ## ZapUPI "Unauthorized" Error
 1. Check credentials in `payment_gateway_config` table
 2. Whitelist your server IP in ZapUPI dashboard
 3. Go to `/admin/backend-status` and check Outbound IP
 
 ---
 
 # 📱 Tablet Development (GitHub Codespaces)
 
 1. Go to your GitHub repository
 2. Click **"Code"** button → **"Codespaces"** tab
 3. Click **"Create codespace on main"**
 4. VS Code opens in browser!
 5. Use terminal as normal
 
 ---
 
 # 🎯 Summary Checklist
 
 - [ ] Supabase project created
 - [ ] Credentials noted (URL, anon key, service key, project ID)
 - [ ] Access token generated
 - [ ] Secrets added (DEEPSEEK_API_KEY, ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY)
 - [ ] ZapUPI credentials in database
 - [ ] Supabase CLI logged in
 - [ ] Project linked
 - [ ] Database pushed
 - [ ] Edge functions deployed
 - [ ] Vercel project created
 - [ ] Environment variables added
 - [ ] Deployed successfully
 - [ ] Webhooks configured
 - [ ] Backend status all green ✓