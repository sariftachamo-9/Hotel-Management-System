# Hotel Management System

A comprehensive, secure, and scalable hotel management system built with Flask and Python.

## Features

- **Role-Based Access Control**: Admin, Receptionist, and Guest roles
- **Guest Management**: Complete guest profiles with ID verification
- **Room Management**: Real-time room status and availability tracking
- **Booking System**: Advance reservations and walk-in bookings with conflict detection
- **Check-in/Check-out**: Streamlined processes with automated billing
- **Service Tracking**: Track additional services during guest stays
- **Billing & Invoicing**: Automated calculations with tax, discounts, and detailed invoices
- **Reports & Analytics**: Occupancy rates, revenue summaries, and guest history
- **Premium UI**: Modern dark theme with responsive design

## Installation

1. **Clone the repository**:
   ```bash
   cd HotelManagementSystem
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Update the configuration values

5. **Initialize database**:
   ```bash
   python init_db.py
   ```

6. **Run the application**:
   ```bash
   python app.py
   ```

7. **Access the application**:
   - Open browser and navigate to `http://localhost:5000`
   - Default admin credentials:
     - Email: `admin@hotel.com`
     - Password: `admin123`

## Project Structure

```
HotelManagementSystem/
├── models/              # Database models
├── auth/                # Authentication system
├── routes/              # API routes (admin, receptionist, guest, common)
├── services/            # Business logic
├── utils/               # Utility functions
├── templates/           # HTML templates
├── static/              # CSS, JS, and assets
├── app.py               # Main application
├── config.py            # Configuration
├── init_db.py           # Database initialization
└── requirements.txt     # Dependencies
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new guest
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

### Admin Routes (`/api/admin/`)
- User management (CRUD)
- Room type and room management
- Service management
- Reports (occupancy, revenue, utilization)

### Receptionist Routes (`/api/receptionist/`)
- Guest registration
- Booking management
- Check-in/check-out operations
- Service addition to stays
- Payment processing

### Guest Routes (`/api/guest/`)
- Profile management
- Booking history
- Invoice access
- Current stay information

## Security Features

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- Secure file uploads
- SQL injection protection
- CSRF protection
- Audit logging

## Technologies Used

- **Backend**: Flask, SQLAlchemy, Flask-JWT-Extended
- **Database**: SQLite (development) / PostgreSQL (production)
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Authentication**: JWT with bcrypt
- **File Handling**: Pillow

## License

This project is created for educational purposes.

## Support

For issues or questions, please create an issue in the repository.
