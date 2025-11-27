# TheraLink

Mental health therapy matching platform - Connect with licensed therapists

## Overview

TheraLink is a web application that connects users with licensed mental health therapists. Features include AI-powered assessments, smart therapist matching, appointment scheduling, and secure HIPAA-compliant messaging.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: GitHub Pages (or your preferred host)

## Project Structure

```
TheraLink/
├── index.html      # Main HTML file
├── styles.css      # CSS styles
├── app.js          # JavaScript with Supabase integration
└── README.md       # This file
```

## Supabase Backend

**Project URL**: `https://igdkkjdtfadagmtfqzmf.supabase.co`

### Database Tables
- `profiles` - User profiles
- `therapists` - Therapist information
- `appointments` - Booking system
- `messages` - Secure messaging
- `assessments` - Mental health assessments

### Features
- Row Level Security (RLS) enabled
- Auto-profile creation on signup
- Secure authentication

## Getting Started

1. Clone this repository
2. Open `index.html` in a browser
3. Sign up for a new account
4. Start connecting with therapists!

## Development

To run locally:
```bash
git clone https://github.com/RishMumm/TheraLink.git
cd TheraLink
# Open index.html in browser or use live server
```

## License

MIT License
