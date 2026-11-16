import db from './db.js';

/**
 * Retrieves all service projects along with the name, logo, and contact
 * email of the organization hosting each one, and the category name.
 *
 * The project table stores only organization_id and category_id, so JOINs
 * against the organization and project_categories tables pull in their details.
 */
const getAllProjects = async () => {
    const query = `
        SELECT
            p.project_id,
            p.name,
            p.description,
            p.event_date,
            p.start_time,
            p.end_time,
            p.recurrence,
            p.location,
            p.volunteers_needed,
            o.organization_id,
            o.name AS organization_name,
            o.logo_filename,
            o.contact_email,
            c.category_id,
            c.name AS category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        JOIN public.project_categories c ON c.category_id = p.category_id
        ORDER BY p.event_date, p.start_time;
    `;

    const result = await db.query(query);

    return result.rows;
};

/**
 * Retrieves all service projects hosted by a single organization, ordered
 * by event date and start time. The category name is joined in so the
 * organization details page can show it alongside each project.
 *
 * Uses a parameterized query ($1) so the ID is never interpolated into the
 * SQL string, which protects against SQL injection.
 */
const getProjectsByOrganizationId = async (organizationId) => {
    const query = `
        SELECT
            p.project_id,
            p.organization_id,
            p.name,
            p.description,
            p.event_date,
            p.start_time,
            p.end_time,
            p.recurrence,
            p.location,
            p.volunteers_needed,
            c.category_id,
            c.name AS category
        FROM public.project p
        JOIN public.project_categories c ON c.category_id = p.category_id
        WHERE p.organization_id = $1
        ORDER BY p.event_date, p.start_time;
    `;

    const queryParams = [organizationId];
    const result = await db.query(query, queryParams);

    return result.rows;
};

/**
 * Retrieves the next `numberOfProjects` upcoming service projects, meaning
 * those whose event date is today or later, soonest first.
 *
 * The project table stores name and event_date; they are also aliased as
 * title and date so callers can use either property name.
 *
 * The limit is passed as a query parameter ($1) rather than interpolated
 * into the SQL string, which protects against SQL injection.
 */
const getUpcomingProjects = async (numberOfProjects) => {
    const query = `
        SELECT
            p.project_id,
            p.name,
            p.name AS title,
            p.description,
            p.event_date,
            p.event_date AS date,
            p.start_time,
            p.end_time,
            p.recurrence,
            p.location,
            p.volunteers_needed,
            p.organization_id,
            o.name AS organization_name,
            o.logo_filename,
            o.contact_email,
            c.category_id,
            c.name AS category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        JOIN public.project_categories c ON c.category_id = p.category_id
        WHERE p.event_date >= CURRENT_DATE
        ORDER BY p.event_date ASC, p.start_time ASC
        LIMIT $1;
    `;

    const queryParams = [numberOfProjects];
    const result = await db.query(query, queryParams);

    return result.rows;
};

/**
 * Retrieves a single service project by its ID, including the hosting
 * organization's name and the category name.
 *
 * Uses a parameterized query ($1) so the ID is never interpolated into the
 * SQL string, which protects against SQL injection.
 */
const getProjectDetails = async (projectId) => {
    const query = `
        SELECT
            p.project_id,
            p.name,
            p.name AS title,
            p.description,
            p.event_date,
            p.event_date AS date,
            p.start_time,
            p.end_time,
            p.recurrence,
            p.location,
            p.volunteers_needed,
            p.organization_id,
            o.name AS organization_name,
            o.logo_filename,
            o.contact_email,
            c.category_id,
            c.name AS category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        JOIN public.project_categories c ON c.category_id = p.category_id
        WHERE p.project_id = $1;
    `;

    const queryParams = [projectId];
    const result = await db.query(query, queryParams);

    // Return the first row of the result set, or null if no rows are found
    return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Retrieves all service projects in a given category, ordered by event
 * date and start time, with the hosting organization's name joined in.
 *
 * Uses a parameterized query ($1) so the ID is never interpolated into the
 * SQL string, which protects against SQL injection.
 */
const getProjectsByCategoryId = async (categoryId) => {
    const query = `
        SELECT
            p.project_id,
            p.name,
            p.name AS title,
            p.description,
            p.event_date,
            p.event_date AS date,
            p.start_time,
            p.end_time,
            p.recurrence,
            p.location,
            p.volunteers_needed,
            p.organization_id,
            o.name AS organization_name,
            o.logo_filename,
            c.category_id,
            c.name AS category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        JOIN public.project_categories c ON c.category_id = p.category_id
        WHERE p.category_id = $1
        ORDER BY p.event_date, p.start_time;
    `;

    const queryParams = [categoryId];
    const result = await db.query(query, queryParams);

    return result.rows;
};

// Export the model functions
export {
    getAllProjects,
    getProjectsByOrganizationId,
    getUpcomingProjects,
    getProjectDetails,
    getProjectsByCategoryId
};
