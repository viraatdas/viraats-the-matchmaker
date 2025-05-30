# 🕒 Weekly Timed Application Portal

A sleek, modern web application that allows users to submit applications before a strict weekly deadline. Features real-time countdown, photo upload, dynamic weekly questions, and full Supabase backend integration.

## ✨ Features

### 🎯 **Core Features**
- **Live Countdown Timer** - Real-time countdown to application deadline
- **Multi-step Application Form** - Progressive form with validation
- **Photo Upload** - Drag & drop photo upload with validation
- **Deadline Enforcement** - Automatically disables submissions when time expires
- **Weekly Question System** - Different questions each week managed through admin panel
- **Duplicate Prevention** - Only one application per email per week

### 🎨 **Modern UI/UX**
- Dark gradient theme with glass morphism effects
- Smooth animations and transitions
- Fully responsive design (mobile & desktop)
- Progressive web app features

### 🗄️ **Backend & Admin**
- **Supabase Integration** - Complete backend with PostgreSQL database
- **Admin Panel** - Manage weekly questions, view applications, export data
- **Photo Storage** - Secure image storage with Supabase Storage
- **Row Level Security** - Protected data access
- **Real-time Stats** - Application analytics and reporting

## 🚀 Quick Start

### Prerequisites
- Supabase account ([Create one here](https://supabase.com))
- Modern web browser
- Local web server (for development)

### 1. Set Up Supabase

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for database to be ready

2. **Run the database schema**
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `database-schema.sql`
   - Click "Run"

3. **Configure Storage**
   - Go to Storage → Create bucket named `application-photos`
   - Make it public
   - The SQL schema handles the storage policies

### 2. Configure the Application

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

2. **Update configuration**
   - Edit `config.js` and replace:
     - `YOUR_SUPABASE_URL` with your project URL
     - `YOUR_SUPABASE_ANON_KEY` with your anon key
   
   Both values can be found in: Supabase Dashboard → Settings → API

### 3. Deploy & Run

**Option A: Local Development**
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

**Option B: Deploy to Vercel/Netlify**
- Simply upload all files to your hosting provider
- Ensure static file serving is enabled

## 📁 Project Structure

```
viraats-the-matchmaker/
├── index.html              # Main application page
├── admin.html              # Admin panel
├── styles.css              # Main application styles
├── admin-styles.css        # Admin panel styles
├── script.js               # Main application logic
├── admin.js                # Admin panel logic
├── supabase.js             # Supabase client & database functions
├── config.js               # Configuration & utilities
├── database-schema.sql     # Complete database schema
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🗄️ Database Schema

### Tables
- **`applications`** - Stores all application submissions
- **`weekly_questions`** - Manages questions for each week
- **`admin_users`** - Admin user management (optional)

### Key Features
- **Weekly isolation** - Applications grouped by week number and year
- **Unique constraints** - One application per email per week
- **Automatic timestamping** - Created/updated timestamps
- **Row Level Security** - Protected data access
- **Storage integration** - Photo storage with public URLs

## 🎛️ Admin Panel Features

Access the admin panel at `/admin.html`

### Dashboard
- Real-time application statistics
- Current week countdown
- Recent submissions overview

### Weekly Questions Management
- View current week's questions
- Create/update questions for any week
- Set custom deadlines
- Support for 2-3 questions per week

### Applications Management
- View all submissions
- Filter by week/year
- Export to CSV
- Detailed application viewer with photos

### Settings
- Test Supabase connection
- Configuration management
- Data management tools

## 🔧 Configuration Options

### Weekly Deadline Calculation
The app automatically calculates deadlines as Sunday 11:59:59 PM of each week. Modify `getCurrentWeekDeadline()` in `config.js` to change this behavior.

### Question Customization
Questions can be customized per week through the admin panel or by directly inserting into the `weekly_questions` table.

### Styling
- Modify `styles.css` for main app styling
- Modify `admin-styles.css` for admin panel styling
- Color scheme is based on CSS custom properties

## 🛡️ Security Features

- **Row Level Security** - Database-level access control
- **File Upload Validation** - Type and size restrictions
- **Rate Limiting** - One application per email per week
- **XSS Protection** - Input sanitization
- **HTTPS Required** - Secure data transmission

## 📱 Mobile Responsive

The application is fully responsive and works on:
- ✅ Desktop browsers
- ✅ Mobile phones (iOS/Android)
- ✅ Tablets
- ✅ Progressive Web App features

## 🔄 Weekly Workflow

1. **Week Setup**: Admin creates questions for upcoming week
2. **Applications Open**: Users can submit applications until deadline
3. **Automatic Closure**: Form automatically closes at deadline
4. **Review Period**: Admin reviews submissions through dashboard
5. **Next Week**: Process repeats with fresh questions

## 🚨 Troubleshooting

### Common Issues

**"Connection failed" error**
- Check Supabase URL and API key in `config.js`
- Verify Supabase project is active
- Check browser console for detailed errors

**Photos not uploading**
- Verify `application-photos` bucket exists in Supabase Storage
- Check bucket is set to public
- Verify file size under 5MB and correct format

**Questions not loading**
- Run the database schema if you haven't
- Check if current week has questions in `weekly_questions` table
- Verify database permissions

### Development Tips

- Use browser developer tools to debug JavaScript issues
- Check Supabase logs for backend errors
- Test with different file types and sizes for photo upload
- Verify responsive design on various screen sizes

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review Supabase documentation
- Check browser console for error messages
- Verify all configuration settings

---

Built with ❤️ using HTML5, CSS3, JavaScript, and Supabase