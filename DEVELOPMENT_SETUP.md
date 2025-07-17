# 🚀 Cashflow Trends AI - Simplified Development Setup

## ✅ **SIMPLIFICATIONS COMPLETED**

I've successfully simplified your project from a complex production setup to a stable development environment:

### **🔧 Changes Made:**

1. **✅ Disabled PM2 Clustering** - Now runs single instance in fork mode
2. **✅ Bypassed Nginx** - App runs directly on localhost:3000  
3. **✅ Simplified Database** - Uses production DB with dev-friendly SSL settings
4. **✅ Centralized Secrets** - All configuration in `.env` file
5. **✅ Removed Redis Dependencies** - Uses in-memory storage for development
6. **✅ Enhanced Logging** - Added development debugging and emojis
7. **✅ Consolidated Code** - Token refresh logic centralized in lib/myob.js

### **🏗️ Architecture Changes:**

- **Sessions**: Memory store (no Redis needed)
- **Token Storage**: In-memory (encrypted only in production)  
- **Database**: Production DB with simplified SSL for dev
- **Logging**: Enhanced with emojis and debug flags
- **File Watching**: PM2 auto-restarts on code changes

---

## 🎯 **QUICK START COMMANDS**

### **1. Install Dependencies (if needed)**
```bash
npm install
```

### **2. Start Development Server**
**Option A: Using PM2 (Recommended)**
```bash
# Install PM2 if not installed
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Check status
pm2 status
```

**Option B: Direct Node.js**
```bash
node server.js
```

### **3. Test the Application**
- **Server**: http://cashflowtrends.ai:3000
- **Health Check**: http://cashflowtrends.ai:3000/health  
- **MYOB OAuth**: http://cashflowtrends.ai:3000/auth/myob

---

## 📁 **Key Files Updated**

### **`.env` - Environment Configuration**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://doadmin:AVNS_yl8Odipw9Hrk5KcOH6l@private-db-postgresql-syd1-15494-do-user-18943176-0.i.db.ondigitalocean.com:25060/defaultdb?sslmode=require
MYOB_CLIENT_ID=7e825f9a-2c09-4fd8-b00f-c585bbe904ca
MYOB_CLIENT_SECRET=0NcMv4ofzqGEi2jcw8Lno0x1
MYOB_REDIRECT_URI=http://localhost:3000/auth/callback
# ... other API keys
DEBUG_OAUTH=true
DEBUG_TOKEN_REFRESH=true
TOKENSTORE_LOGGING=true
```

### **`server.js` - Simplified Application Server**
- ✅ Memory-based sessions (no Redis)
- ✅ Development logging middleware  
- ✅ Health check endpoint
- ✅ Enhanced startup messages
- ✅ Graceful shutdown handling

### **`db.js` - Simplified Database Connection**
- ✅ Development-friendly SSL configuration
- ✅ Better error messages with troubleshooting hints
- ✅ Connection pool optimized for development

### **`tokenStore.js` - Dual-Mode Token Storage**
- ✅ In-memory storage for development
- ✅ Redis/encryption only for production
- ✅ Environment-based initialization

### **`lib/myob.js` - Enhanced MYOB Integration**
- ✅ Development debug logging
- ✅ Better error handling and messages
- ✅ Added `getCompanyFiles()` helper function

### **`ecosystem.config.js` - Development PM2 Configuration**
- ✅ Single fork instance (no clustering)
- ✅ File watching for auto-restart
- ✅ Development-friendly logging
- ✅ Enhanced ignore patterns

---

## 🧪 **Testing & Verification**

### **1. Test Environment Setup**
```bash
node test-setup.js
```

### **2. Manual Testing Steps**
1. **Server Health**: `curl http://cashflowtrends.ai:3000/health`
2. **MYOB OAuth**: Visit `http://cashflowtrends.ai:3000/auth/myob`
3. **Login with**: erik@hit-equipment.com.au / Heinous77!!
4. **Check Logs**: `pm2 logs` or check console output

### **3. Expected OAuth Flow**
1. Visit `http://cashflowtrends.ai:3000/auth/myob` → redirects to MYOB
2. Login with your credentials
3. MYOB redirects to `http://cashflowtrends.ai:3000/auth/callback`  
4. App processes tokens and redirects to company selection
5. Select company file → ready for data sync

---

## 🐛 **Troubleshooting**

### **Common Issues & Solutions**

**Port Already in Use:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Database Connection Issues:**
- Check internet connectivity
- Verify DATABASE_URL in `.env`
- SSL errors are handled automatically

**MYOB OAuth Issues:**
- Ensure MYOB_REDIRECT_URI matches exactly: `http://cashflowtrends.ai:3000/auth/callback`
- Check debug logs with `DEBUG_OAUTH=true`

**PM2 Issues:**
```bash
# Reset PM2
pm2 delete all
pm2 kill
pm2 start ecosystem.config.js
```

---

## 📋 **Development Commands**

### **PM2 Management**
```bash
pm2 start ecosystem.config.js    # Start app
pm2 logs                         # View logs  
pm2 status                       # Check status
pm2 restart all                  # Restart
pm2 stop all                     # Stop
pm2 delete all                   # Remove from PM2
pm2 flush                        # Clear logs
```

### **Development Helpers**
```bash
# Run setup test
node test-setup.js

# Start with enhanced logging
DEBUG_OAUTH=true node server.js

# Check environment variables
node -e "console.log(process.env)" | grep MYOB
```

---

## 🔮 **Next Steps After Stable**

Once you confirm everything works:

1. **Core Features Testing**:
   - ✅ MYOB OAuth login
   - ✅ Company file selection  
   - ✅ Data synchronization
   - ✅ Pinecone vector storage
   - ✅ AI analysis features

2. **When Ready for Production**:
   - Re-enable Redis for sessions
   - Add back Nginx proxy
   - Enable PM2 clustering
   - Restore full SSL configuration
   - Add production monitoring

---

## 🎯 **Success Indicators**

Your development environment is working when:

- ✅ Server starts without crashes
- ✅ Health endpoint returns JSON
- ✅ MYOB OAuth completes successfully  
- ✅ No Redis/clustering errors in logs
- ✅ File changes trigger auto-restart
- ✅ Database connection established

**Ready to focus on core features without production complexity!** 🎉 