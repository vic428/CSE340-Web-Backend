import bcrypt from 'bcrypt';
import db from './db.js';

/**
 * Creates a new user in the database and assigns them the default "user" role.
 *
 * The role is looked up by name inside the INSERT so the code does not
 * depend on a particular role_id value.
 *
 * @param {string} name - The user's display name.
 * @param {string} email - The user's email address (used as the username).
 * @param {string} passwordHash - The bcrypt hash of the user's password.
 * @returns {number} The id of the newly created user record.
 */
const createUser = async (name, email, passwordHash) => {
    const default_role = 'user';
    const query = `
        INSERT INTO users (name, email, password_hash, role_id)
        VALUES ($1, $2, $3, (SELECT role_id FROM roles WHERE role_name = $4))
        RETURNING user_id
    `;
    const queryParams = [name, email, passwordHash, default_role];

    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
        throw new Error('Failed to create user');
    }

    if (process.env.ENABLE_SQL_LOGGING === 'true') {
        console.log('Created new user with ID:', result.rows[0].user_id);
    }

    return result.rows[0].user_id;
};

/**
 * Finds a user by email address.
 * @param {string} email - The email address to look up.
 * @returns {object|null} The user record (including password_hash), or null if not found.
 */
const findUserByEmail = async (email) => {
    // The role name is joined in so the session can hold "user" or "admin"
    // instead of a role_id number
    const query = `
        SELECT u.user_id, u.name, u.email, u.password_hash, r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = $1
    `;
    const queryParams = [email];

    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
        return null; // User not found
    }

    return result.rows[0];
};

/**
 * Checks a plain text password against a stored bcrypt hash.
 * @param {string} password - The plain text password the user typed.
 * @param {string} passwordHash - The stored hash to compare against.
 * @returns {boolean} True if the password matches the hash.
 */
const verifyPassword = async (password, passwordHash) => {
    return bcrypt.compare(password, passwordHash);
};

/**
 * Authenticates a user by email and password.
 * @param {string} email - The user's email address.
 * @param {string} password - The plain text password the user typed.
 * @returns {object|null} The user (without password_hash) if the email and
 *   password are correct, otherwise null.
 */
const authenticateUser = async (email, password) => {
    const user = await findUserByEmail(email);

    if (!user) {
        return null;
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
        return null;
    }

    // Never pass the hash on to the controller or the session
    delete user.password_hash;

    return user;
};

/**
 * Retrieves all registered users with the name of their role, ordered by
 * name. The password hash is deliberately not selected.
 * @returns {Array<object>} The users: user_id, name, email, role_name, created_at.
 */
const getAllUsers = async () => {
    const query = `
        SELECT u.user_id, u.name, u.email, r.role_name, u.created_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.name, u.email
    `;

    const result = await db.query(query);

    return result.rows;
};

export { createUser, authenticateUser, getAllUsers };
