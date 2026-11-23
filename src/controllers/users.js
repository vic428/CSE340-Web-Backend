// Import any needed libraries and model functions
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { createUser, authenticateUser, getAllUsers } from '../models/users.js';

// How many times bcrypt runs its hashing algorithm; higher is slower but stronger
const SALT_ROUNDS = 10;

// The database reports this error code when a unique value (here, the
// email address) is already in use
const UNIQUE_VIOLATION = '23505';

// Define validation and sanitization rules for the registration form.
// .bail() stops at the first failed rule so each field reports one message.
const registrationValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .bail()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .bail()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .bail()
        .isLength({ max: 100 })
        .withMessage('Email cannot exceed 100 characters')
        // Store emails in lowercase so "A@b.org" and "a@b.org" are one account
        .toLowerCase(),
    // The password is not trimmed: spaces are allowed as part of a password.
    // bcrypt only uses the first 72 bytes, so longer passwords are refused.
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .bail()
        .isLength({ min: 7, max: 72 })
        .withMessage('Password must be between 7 and 72 characters')
];

// Define any controller functions
const showUserRegistrationForm = (req, res) => {
    const title = 'Register';

    res.render('register', { title });
};

const processUserRegistrationForm = async (req, res) => {
    // Check for validation errors
    const results = validationResult(req);
    if (!results.isEmpty()) {
        // Validation failed - loop through errors
        results.array().forEach((error) => {
            req.flash('error', error.msg);
        });

        // Redirect back to the registration form
        return res.redirect('/register');
    }

    const { name, email, password } = req.body;

    try {
        // Hash the password so the plain text is never stored
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await createUser(name, email, passwordHash);

        req.flash('success', 'Registration successful! Your account has been created.');
        res.redirect('/');
    } catch (error) {
        console.error('Error registering user:', error.message);
        req.flash('error', error.code === UNIQUE_VIOLATION
            ? 'An account with that email address already exists.'
            : 'There was an error creating your account. Please try again.');
        res.redirect('/register');
    }
};

// Replace the current session with a brand new, empty one. Used at login and
// logout so a session id from before the change can never be reused.
const regenerateSession = (req) => new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
});

const showLoginForm = (req, res) => {
    const title = 'Login';

    res.render('login', { title });
};

const processLoginForm = async (req, res) => {
    // Emails are stored in lowercase, so compare in lowercase
    const email = (req.body?.email ?? '').toString().trim().toLowerCase();
    const password = (req.body?.password ?? '').toString();

    const user = email && password ? await authenticateUser(email, password) : null;

    if (!user) {
        // The same message is used for an unknown email and a wrong password,
        // so the form does not reveal which accounts exist
        req.flash('error', 'Login failed. Please check your email and password.');
        return res.redirect('/login');
    }

    // Start a fresh session for the logged-in user, then store the user in it
    await regenerateSession(req);
    req.session.user = user;

    req.flash('success', 'Login successful. Welcome back, ' + user.name + '!');

    // Log the user for debugging (the password hash was already removed)
    if (process.env.NODE_ENV?.toLowerCase() === 'development') {
        console.log('User logged in:', user);
    }

    res.redirect('/dashboard');
};

const processLogout = async (req, res) => {
    // Flash messages live in the session, so destroying the session outright
    // would leave nowhere to store the "logged out" message. Regenerating
    // discards the old session (and the user in it) and provides a new empty one.
    await regenerateSession(req);

    req.flash('success', 'You have been logged out.');
    res.redirect('/login');
};

// Middleware that only lets logged-in users continue to the route.
// Place it before the controller function in a route definition.
const requireLogin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        req.flash('error', 'You must be logged in to access that page.');
        return res.redirect('/login');
    }
    next();
};

// Middleware factory: returns a middleware function that only lets users
// with the given role continue to the route.
//   router.get('/admin-page', requireRole('admin'), showAdminPage);
const requireRole = (role) => {
    return (req, res, next) => {
        // Not logged in at all: send the visitor to the login page
        if (!req.session || !req.session.user) {
            req.flash('error', 'You must be logged in to access that page.');
            return res.redirect('/login');
        }

        // Logged in, but without the required role: back to their dashboard
        if (req.session.user.role_name !== role) {
            req.flash('error', 'You do not have permission to access that page.');
            return res.redirect('/dashboard');
        }

        next();
    };
};

const showDashboard = (req, res) => {
    // requireLogin runs first, so the session always has a user here
    const { name, email } = req.session.user;
    const title = 'Dashboard';

    res.render('dashboard', { title, name, email });
};

const showUsersPage = async (req, res) => {
    const users = await getAllUsers();
    const title = 'Registered Users';

    res.render('users', { title, users });
};

// Export any controller functions
export {
    showUserRegistrationForm,
    processUserRegistrationForm,
    registrationValidation,
    showLoginForm,
    processLoginForm,
    processLogout,
    requireLogin,
    requireRole,
    showDashboard,
    showUsersPage
};
