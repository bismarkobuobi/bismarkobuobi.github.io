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
