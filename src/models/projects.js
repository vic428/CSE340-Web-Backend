import db from './db.js';

/**
 * A project can have several categories, stored in the many-to-many
 * project_category table. This join adds two columns to a project query:
 *   cat.categories - a JSON array of { category_id, name }, ordered by name
 *   cat.category   - the category names as one comma-separated string
 *
 * The subquery always returns exactly one row, so projects with no
 * categories still appear (with an empty array and a NULL string).
 * It expects the project table to be aliased as "p".
 */
const PROJECT_CATEGORIES_JOIN = `
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(
                    json_agg(json_build_object('category_id', c.category_id, 'name', c.name) ORDER BY c.name),
                    '[]'::json
                ) AS categories,
                string_agg(c.name, ', ' ORDER BY c.name) AS category
            FROM public.project_category pc
            JOIN public.project_categories c ON c.category_id = pc.category_id
            WHERE pc.project_id = p.project_id
        ) cat ON true`;

/**
 * Retrieves all service projects along with the name, logo, and contact
 * email of the organization hosting each one, and the category name.
 *
 * The project table stores only organization_id, so a JOIN against the
 * organization table pulls in its details, and the project's categories
 * come from the project_category link table.
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
            cat.categories,
            cat.category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        ${PROJECT_CATEGORIES_JOIN}
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
            cat.categories,
            cat.category
        FROM public.project p
        ${PROJECT_CATEGORIES_JOIN}
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
            cat.categories,
            cat.category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        ${PROJECT_CATEGORIES_JOIN}
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
            cat.categories,
            cat.category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        ${PROJECT_CATEGORIES_JOIN}
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
            cat.categories,
            cat.category
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        ${PROJECT_CATEGORIES_JOIN}
        WHERE EXISTS (
            SELECT 1
            FROM public.project_category pc
            WHERE pc.project_id = p.project_id
              AND pc.category_id = $1
        )
        ORDER BY p.event_date, p.start_time;
    `;

    const queryParams = [categoryId];
    const result = await db.query(query, queryParams);

    return result.rows;
};

/**
 * Creates a new service project in the database.
 *
 * The project table stores the title in the `name` column and the date in
 * `event_date`. It also requires a start time, end time, number of
 * volunteers, and category, none of which have defaults, so they are passed
 * in the `details` object.
 *
 * @param {string} title - The name of the project.
 * @param {string} description - A description of the project.
 * @param {string} location - Where the project takes place.
 * @param {string} date - The date of the project (YYYY-MM-DD).
 * @param {string|number} organizationId - The id of the hosting organization.
 * @param {object} details - The remaining required project fields.
 * @param {string} details.startTime - Start time (HH:MM).
 * @param {string} details.endTime - End time (HH:MM).
 * @param {string|number} details.volunteersNeeded - Number of volunteers needed.
 * @param {string|number} details.categoryId - The id of the project's category.
 * @param {string} [details.recurrence] - Optional recurrence, e.g. "Weekly".
 * @returns {number} The id of the newly created project record.
 */
const createProject = async (title, description, location, date, organizationId, details = {}) => {
    const { startTime, endTime, volunteersNeeded, categoryId, recurrence = null } = details;

    // The category is saved twice in one statement: in the project table's
    // required category_id column, and in the project_category link table
    // that the rest of the site reads from.
    const query = `
      WITH new_project AS (
          INSERT INTO project (
              name, description, location, event_date, organization_id,
              start_time, end_time, volunteers_needed, category_id, recurrence
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING project_id, category_id
      ),
      new_link AS (
          INSERT INTO project_category (project_id, category_id)
          SELECT project_id, category_id FROM new_project
      )
      SELECT project_id FROM new_project;
    `;

    const queryParams = [
        title, description, location, date, organizationId,
        startTime, endTime, volunteersNeeded, categoryId, recurrence
    ];
    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
        throw new Error('Failed to create project');
    }

    if (process.env.ENABLE_SQL_LOGGING === 'true') {
        console.log('Created new project with ID:', result.rows[0].project_id);
    }

    return result.rows[0].project_id;
};

/**
 * Updates an existing service project in the database.
 *
 * The organization id is part of the update, so a project can be moved to
 * a different organization. Categories are not changed here; they are
 * managed through the project_category table (see updateCategoryAssignments).
 *
 * @param {string|number} projectId - The id of the project to update.
 * @param {string} title - The name of the project.
 * @param {string} description - A description of the project.
 * @param {string} location - Where the project takes place.
 * @param {string} date - The date of the project (YYYY-MM-DD).
 * @param {string|number} organizationId - The id of the hosting organization.
 * @param {object} details - The remaining project fields.
 * @param {string} details.startTime - Start time (HH:MM).
 * @param {string} details.endTime - End time (HH:MM).
 * @param {string|number} details.volunteersNeeded - Number of volunteers needed.
 * @param {string} [details.recurrence] - Optional recurrence, e.g. "Weekly".
 * @returns {number} The id of the updated project record.
 */
const updateProject = async (projectId, title, description, location, date, organizationId, details = {}) => {
    const { startTime, endTime, volunteersNeeded, recurrence = null } = details;

    const query = `
      UPDATE project
      SET name = $1,
          description = $2,
          location = $3,
          event_date = $4,
          organization_id = $5,
          start_time = $6,
          end_time = $7,
          volunteers_needed = $8,
          recurrence = $9
      WHERE project_id = $10
      RETURNING project_id;
    `;

    const queryParams = [
        title, description, location, date, organizationId,
        startTime, endTime, volunteersNeeded, recurrence, projectId
    ];
    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
        throw new Error('Project not found');
    }

    if (process.env.ENABLE_SQL_LOGGING === 'true') {
        console.log('Updated project with ID:', projectId);
    }

    return result.rows[0].project_id;
};

// Export the model functions
export {
    createProject,
    updateProject,
    getAllProjects,
    getProjectsByOrganizationId,
    getUpcomingProjects,
    getProjectDetails,
    getProjectsByCategoryId
};
