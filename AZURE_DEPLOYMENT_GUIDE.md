# Azure Deployment Guide for New Agent Demo Platform

This guide will walk you through deploying the New Agent Demo Platform to Microsoft Azure. This guide is written for non-technical users and requires only an Azure subscription.

## Prerequisites

- **Azure Subscription**: You must have an active Azure subscription
- **Web Browser**: Any modern web browser (Chrome, Firefox, Safari, Edge)
- **Basic Computer Skills**: Ability to copy/paste text and navigate web interfaces

## Overview

We will deploy:
1. **PostgreSQL Database** - To store application data
2. **Web App** - To host the backend API
3. **Static Web App** - To host the frontend React application
4. **Azure Active Directory App** - For Office 365 authentication

**Estimated Time**: 45-60 minutes
**Estimated Cost**: $10-30 per month (depending on usage)

---

## Step 1: Create Azure Active Directory App Registration

This enables Office 365 authentication for your application.

### 1.1 Access Azure Portal
1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Azure account
3. In the search bar at the top, type "Azure Active Directory" and click on it

### 1.2 Create App Registration
1. In the left sidebar, click **"App registrations"**
2. Click **"+ New registration"** at the top
3. Fill in the following:
   - **Name**: `NewAgentDemo-Auth`
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `https://YOUR-APP-NAME.azurewebsites.net/api/auth/azure/callback`
     - (Replace YOUR-APP-NAME with a unique name you'll use later)
4. Click **"Register"**

### 1.3 Save Important Information
After registration, you'll see an overview page. **SAVE THESE VALUES** (you'll need them later):
- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value

### 1.4 Create Client Secret
1. In the left sidebar, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Description: `NewAgentDemo Secret`
4. Expires: **24 months** (recommended)
5. Click **"Add"**
6. **IMMEDIATELY COPY THE SECRET VALUE** - you won't be able to see it again
7. Save this as your **Client Secret**

### 1.5 Configure API Permissions
1. In the left sidebar, click **"API permissions"**
2. You should see "Microsoft Graph" with "User.Read" permission (this is correct)
3. Click **"Grant admin consent for [Your Organization]"**
4. Click **"Yes"** to confirm

---

## Step 2: Create PostgreSQL Database

### 2.1 Create Azure Database for PostgreSQL
1. In the Azure Portal search bar, type "Azure Database for PostgreSQL" and select it
2. Click **"+ Create"**
3. Select **"Flexible server"** and click **"Create"**

### 2.2 Configure Database Settings
**Basics Tab:**
- **Subscription**: Your Azure subscription
- **Resource Group**: Click "Create new" and name it `NewAgentDemo-RG`
- **Server name**: Choose a unique name like `newagentdemo-db-[your-initials]`
- **Region**: Choose a region near you (e.g., East US, West Europe)
- **PostgreSQL version**: **14** (recommended)
- **Workload type**: **Development**

**Authentication Tab:**
- **Authentication method**: **PostgreSQL authentication only**
- **Admin username**: `newagentadmin`
- **Password**: Create a strong password and **SAVE IT**
- **Confirm password**: Re-enter the password

### 2.3 Configure Networking
**Networking Tab:**
- **Connectivity method**: **Public access (allowed IP addresses)**
- **Firewall rules**: 
  - Check **"Allow public access from any Azure service within Azure to this server"**
  - Add your current IP address (should auto-populate)

### 2.4 Review and Create
1. Click **"Review + create"**
2. Review all settings
3. Click **"Create"**
4. Wait 5-10 minutes for deployment to complete

### 2.5 Get Database Connection Information
1. Once deployed, click **"Go to resource"**
2. In the overview page, note down:
   - **Server name** (something like: newagentdemo-db-xxx.postgres.database.azure.com)
   - **Admin username**: newagentadmin
   - **Password**: The password you created
3. The database name will be: `postgres` (default)

---

## Step 3: Deploy Backend Application

### 3.1 Create Web App
1. In Azure Portal search bar, type "App Services" and select it
2. Click **"+ Create"** then **"Web App"**

### 3.2 Configure Web App
**Basics:**
- **Subscription**: Your Azure subscription
- **Resource Group**: Select `NewAgentDemo-RG` (created earlier)
- **Name**: Choose unique name like `newagentdemo-api-[your-initials]`
- **Publish**: **Code**
- **Runtime stack**: **Node 18 LTS**
- **Operating System**: **Linux**
- **Region**: Same region as your database

**App Service Plan:**
- Click **"Create new"**
- Name: `NewAgentDemo-Plan`
- **Pricing tier**: Click "Explore pricing plans"
  - For testing: Select **"Basic B1"** (about $13/month)
  - For production: Select **"Standard S1"** (about $56/month)

### 3.3 Create and Configure
1. Click **"Review + create"**
2. Click **"Create"**
3. Wait for deployment (2-3 minutes)
4. Click **"Go to resource"**

### 3.4 Configure Environment Variables
1. In the left sidebar, click **"Configuration"**
2. Click **"+ New application setting"** for each of the following:

**Add these Application Settings one by one:**

| Name | Value |
|------|-------|
| `DB_HOST` | Your PostgreSQL server name (from Step 2.5) |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `newagentadmin` |
| `DB_PASSWORD` | Your database password |
| `JWT_SECRET` | Generate a random 32-character string (use a password generator) |
| `AZURE_CLIENT_ID` | Your Application (client) ID from Step 1.3 |
| `AZURE_CLIENT_SECRET` | Your Client Secret from Step 1.4 |
| `AZURE_TENANT_ID` | Your Directory (tenant) ID from Step 1.3 |
| `AZURE_REDIRECT_URI` | `https://YOUR-WEB-APP-NAME.azurewebsites.net/api/auth/azure/callback` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://YOUR-STATIC-WEB-APP-NAME.azurestaticapps.net` (we'll update this later) |
| `SESSION_SECRET` | Generate another random 32-character string |

3. Click **"Save"** at the top

### 3.5 Deploy Backend Code
1. In the left sidebar, click **"Deployment Center"**
2. **Source**: Select **GitHub** (you'll need to authorize Azure to access your GitHub)
3. **Organization**: Your GitHub username
4. **Repository**: `NewAgentDemo` (the repository name you'll create)
5. **Branch**: `main`
6. **Build provider**: **GitHub Actions**
7. **Runtime stack**: **Node.js**
8. **Version**: **18 LTS**
9. Click **"Save"**

**Note**: If you haven't created a GitHub repository yet, you'll need to:
1. Go to [GitHub.com](https://github.com)
2. Create a new repository named "NewAgentDemo"
3. Upload the codebase we created
4. Then return to complete this step

---

## Step 4: Deploy Frontend Application

### 4.1 Create Static Web App
1. In Azure Portal search bar, type "Static Web Apps" and select it
2. Click **"+ Create"**

### 4.2 Configure Static Web App
**Basics:**
- **Subscription**: Your Azure subscription
- **Resource Group**: Select `NewAgentDemo-RG`
- **Name**: `newagentdemo-frontend-[your-initials]`
- **Plan type**: **Free** (for testing) or **Standard** (for production)
- **Region**: Same as your other resources

**Deployment Details:**
- **Source**: **GitHub**
- **GitHub account**: Authorize and select your account
- **Organization**: Your GitHub username
- **Repository**: `NewAgentDemo`
- **Branch**: `main`

**Build Details:**
- **Build presets**: **React**
- **App location**: `/frontend`
- **Output location**: `build`

### 4.3 Create and Get URL
1. Click **"Review + create"**
2. Click **"Create"**
3. Wait for deployment (3-5 minutes)
4. Click **"Go to resource"**
5. Note the **URL** (something like: https://xxx-xxx.azurestaticapps.net)

### 4.4 Update Backend Configuration
1. Go back to your **App Service** (backend)
2. Go to **Configuration** → **Application settings**
3. Find the `FRONTEND_URL` setting
4. Update its value to your Static Web App URL (from step 4.3)
5. Click **"Save"**

### 4.5 Update Azure AD Redirect URI
1. Go back to **Azure Active Directory** → **App registrations**
2. Click on your app registration (`NewAgentDemo-Auth`)
3. Click **"Authentication"**
4. Update the redirect URI to use your actual backend URL:
   `https://YOUR-ACTUAL-BACKEND-URL.azurewebsites.net/api/auth/azure/callback`
5. Click **"Save"**

---

## Step 5: Create Administrator User

Since new users default to "Demo User" role, you need to manually promote your first user to Administrator.

### 5.1 First Login
1. Visit your frontend URL (from Step 4.3)
2. Click "Login with Office 365"
3. Complete the Office 365 authentication
4. You should be logged in as a "Demo User"

### 5.2 Access Database
1. In Azure Portal, go to your **PostgreSQL database**
2. In the left sidebar, click **"Query editor (preview)"**
3. Sign in with your database credentials:
   - **Server**: Your server name
   - **Database**: `postgres`
   - **Authentication type**: **PostgreSQL authentication**
   - **Username**: `newagentadmin`
   - **Password**: Your database password

### 5.3 Promote to Administrator
1. In the query editor, run this SQL command (replace YOUR_EMAIL with your actual email):
```sql
UPDATE "User" SET role = 'Administrator' WHERE email = 'YOUR_EMAIL@yourdomain.com';
```
2. Click **"Run"**
3. You should see "1 row affected"

### 5.4 Verify Administrator Access
1. Log out of the frontend application
2. Log back in
3. You should now see the Administrator menu options

---

## Step 6: Configure Domain and Firewall Settings

### 6.1 Custom Domain (Optional)
If you want to use your own domain:

**For Static Web App (Frontend):**
1. Go to your Static Web App resource
2. Click **"Custom domains"**
3. Click **"+ Add"** and follow the instructions

**For App Service (Backend):**
1. Go to your App Service resource
2. Click **"Custom domains"**
3. Click **"+ Add custom domain"** and follow the instructions

### 6.2 SSL Certificate
Both Azure Static Web Apps and App Services provide automatic SSL certificates for .azurewebsites.net and .azurestaticapps.net domains.

### 6.3 Database Security
1. Go to your PostgreSQL database
2. Click **"Networking"**
3. Review firewall rules
4. Remove your personal IP if you only added it for setup
5. Ensure "Allow public access from any Azure service" is enabled

---

## Step 7: Testing and Verification

### 7.1 Test Application
1. Visit your frontend URL
2. Test Office 365 login
3. Verify administrator features work:
   - Domain management
   - Agent management
   - Q&A management
4. Test demo user features:
   - View agents
   - Chat functionality

### 7.2 Check Logs
If something isn't working:

**Backend Logs:**
1. Go to your App Service
2. Click **"Log stream"** to see real-time logs
3. Or click **"Logs"** for historical logs

**Database Logs:**
1. Go to your PostgreSQL database
2. Click **"Logs"** to see database activity

### 7.3 Monitor Performance
1. Both App Service and Static Web Apps provide built-in monitoring
2. Go to the **"Monitoring"** section in each resource
3. Set up alerts if needed

---

## Step 8: Backup and Maintenance

### 8.1 Database Backup
1. Go to your PostgreSQL database
2. Click **"Backup and restore"**
3. Automated backups are enabled by default
4. You can also create manual backups

### 8.2 Application Updates
When you want to update your application:
1. Push changes to your GitHub repository
2. Azure will automatically redeploy both frontend and backend
3. Check the **"Deployment Center"** for deployment status

### 8.3 Scale Resources
If you need more performance:
1. **App Service**: Go to **"Scale up"** to change pricing tier
2. **Database**: Go to **"Compute + storage"** to increase resources
3. **Static Web App**: Upgrade to Standard plan for more features

---

## Cost Management

### Expected Monthly Costs:
- **PostgreSQL Database**: $15-50 (depending on size)
- **App Service**: $13-56 (depending on tier)
- **Static Web App**: $0-9 (Free tier available)
- **Total**: ~$30-115 per month

### Cost Optimization Tips:
1. Use **Basic** tiers for testing/development
2. Use **Standard** tiers for production
3. Set up **Cost Alerts** in Azure to monitor spending
4. Stop/start resources during non-business hours if applicable

---

## Troubleshooting

### Common Issues:

**1. Login doesn't work**
- Check Azure AD app registration redirect URI
- Verify AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID

**2. Database connection fails**
- Check firewall rules in PostgreSQL
- Verify database credentials in App Service configuration

**3. Frontend can't reach backend**
- Check FRONTEND_URL in backend configuration
- Verify CORS settings

**4. Application won't start**
- Check App Service logs
- Verify all environment variables are set

### Getting Help:
1. Check Azure Portal for error messages
2. Use the **"Diagnose and solve problems"** feature in each resource
3. Contact Azure Support if needed

---

## Security Best Practices

1. **Regularly update dependencies** by pushing updates to GitHub
2. **Monitor access logs** in Azure
3. **Use strong passwords** for database
4. **Enable Azure Security Center** recommendations
5. **Regularly backup your database**
6. **Review user access** periodically

---

## Summary

Your New Agent Demo Platform is now deployed on Azure with:
- ✅ Office 365 authentication
- ✅ PostgreSQL database
- ✅ Scalable backend API
- ✅ Fast frontend delivery
- ✅ Automatic deployments from GitHub
- ✅ SSL certificates
- ✅ Monitoring and logs

**Your application URLs:**
- Frontend: https://YOUR-STATIC-WEB-APP.azurestaticapps.net
- Backend API: https://YOUR-APP-SERVICE.azurewebsites.net

The platform is ready to use with administrator and demo user roles!