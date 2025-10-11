# Bismark Obuobi - Portfolio Website

A vintage-style, animated portfolio website with a retro terminal/CRT screen aesthetic.

## 🎨 Features

- **Vintage CRT Screen Effect**: Scanlines and subtle screen flicker for that authentic retro feel
- **Terminal-Inspired Design**: Command-line interface aesthetics throughout
- **Smooth Animations**: Typewriter effects, fade-ins, and glitch animations
- **Fully Responsive**: Works on desktop, tablet, and mobile devices
- **Interactive Elements**: Hover effects, parallax scrolling, and animated skill bars
- **Easter Eggs**: Console messages and Konami code surprise

## 📝 Customization Guide

### 1. Personal Photo

- **Location**: `index.html` around line 90
- Replace the placeholder div with your image:

```html
<img src="images/profile.jpg" alt="Bismark Obuobi" />
```

- Create an `images` folder and add your photo there

### 2. Contact Information

All contact links are in the **Contact Section** (around line 350-380 in `index.html`):

- **Email**: Replace `your.email@example.com` (appears 3 times)
- **GitHub**: Replace `yourusername` with your GitHub username
- **LinkedIn**: Replace `yourprofile` with your LinkedIn profile
- **Twitter/X**: Replace `yourhandle` with your handle (or remove if not needed)
- **Phone**: Replace `+233xxxxxxxxx` with your actual phone number

### 3. Social Media Links

Look for `<!-- TODO:` comments in the contact section and update:

- GitHub URL
- LinkedIn URL
- Twitter/X URL
- Any other social media you want to add

### 4. Projects

You can add more projects by copying the `project-card` div structure (around line 280-340)

### 5. Skills

Adjust skill percentages in the `styles.css` file or directly in HTML:

- Look for `data-progress` attributes
- Change the percentage values to match your proficiency

## 🚀 Getting Started

1. Open `index.html` in your browser to view the website
2. Search for `<!-- TODO:` comments in the HTML to find areas requiring customization
3. Replace placeholder content with your actual information
4. Add your profile photo to an `images` folder

## 🌐 How to Host Your Portfolio

### Option 1: GitHub Pages (FREE & Recommended)

**Steps:**

1. Create a GitHub account (if you don't have one)
2. Create a new repository named `your-username.github.io`
3. Upload all your portfolio files (index.html, styles.css, script.js, images folder)
4. Go to repository Settings → Pages
5. Under "Source", select "main" branch
6. Your site will be live at `https://your-username.github.io`

**Using Git:**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-username.github.io.git
git push -u origin main
```

### Option 2: Netlify (FREE)

**Steps:**

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "Add new site" → "Deploy manually"
3. Drag and drop your Portfolio folder
4. Your site will be live instantly with a free subdomain
5. Optional: Connect a custom domain

**Using Netlify CLI:**

```bash
npm install -g netlify-cli
cd Portfolio
netlify deploy --prod
```

### Option 3: Vercel (FREE)

**Steps:**

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "New Project"
3. Import your GitHub repository (or drag and drop files)
4. Click "Deploy"
5. Your site will be live in seconds

### Option 4: Render (FREE)

**Steps:**

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Set build command to empty and publish directory to `.`
5. Click "Create Static Site"

### Option 5: Traditional Web Hosting

If you have a hosting service (like cPanel hosting):

1. Use FTP/SFTP client (like FileZilla)
2. Upload all files to the `public_html` or `www` directory
3. Access via your domain name

### Custom Domain Setup

After hosting on any free platform, you can add a custom domain:

1. Buy a domain from Namecheap, GoDaddy, or Google Domains
2. In your hosting dashboard, add the custom domain
3. Update DNS records in your domain registrar:
   - Add A record or CNAME record as instructed by your host
4. Wait 24-48 hours for DNS propagation

### 🎯 My Recommendation for You

Since you're a student and want to showcase your work professionally:

1. **Use GitHub Pages** - It's free, reliable, and shows you know Git
2. **Custom Domain** - Buy `bismarkobuobi.com` or `bismarkdev.com` (~$10-15/year)
3. **Professional Email** - Set up email@yourdomain.com

This combination is what most developers use and it's completely free (except the domain)!

## 🎯 File Structure

```
Portfolio/
│
├── index.html          # Main HTML file
├── styles.css          # All styling and animations
├── script.js           # Interactive functionality
├── README.md           # This file
└── images/            # Create this folder for your images
    └── profile.jpg    # Your profile photo
```

## 🎨 Color Customization

To change the color scheme, edit the CSS variables in `styles.css` (around line 10):

```css
:root {
  --primary-color: #00ff00; /* Main accent color */
  --secondary-color: #00cc00; /* Secondary accent */
  --bg-color: #0a0a0a; /* Background */
  --card-bg: #1a1a1a; /* Card backgrounds */
  --text-color: #00ff00; /* Text color */
  --border-color: #00ff00; /* Border color */
}
```

## 📱 Responsive Design

The website is fully responsive and adapts to:

- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🎭 Animations Included

- Typewriter effect
- Glitch effect on titles
- Fade-in animations
- Skill bar progress animations
- Hover effects
- Parallax scrolling
- CRT screen effects (scanlines & flicker)

## 🔧 Technologies Used

- HTML5
- CSS3 (with animations and custom properties)
- Vanilla JavaScript (no frameworks)

## 📌 Notes

- No external dependencies required
- Works offline
- Fast loading times
- Cross-browser compatible
- SEO-friendly structure

## 🎮 Easter Eggs

- Check the browser console for ASCII art
- Try the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A

## 📄 License

Feel free to use this template for your own portfolio. Good luck with your journey to becoming a world-class software engineer! 🚀

---

**Built with passion by Bismark Obuobi** | Backend Developer | System Design Enthusiast
