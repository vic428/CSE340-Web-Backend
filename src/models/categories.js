import db from './db.js';

/**
 * Retrieves all service project categories along with a count of the
 * projects currently assigned to each one.
 *
 * A LEFT JOIN is used so categories with no projects still appear
 * (with a project_count of 0).
 */
const getAllCategories = async () => {
    const query = `
        SELECT
            c.category_id,
            c.name,
            c.description,
            COUNT(p.project_id)::INTEGER AS project_count
        FROM public.project_categories c
        LEFT JOIN public.project p ON p.category_id = c.category_id
        GROUP BY c.category_id, c.name, c.description
        ORDER BY c.category_id;
    `;

    const result = await db.query(query);

    return result.rows;
};

/**
 * Retrieves a single category by its ID.
 *
 * Uses a parameterized query ($1) so the ID is never interpolated into the
 * SQL string, which protects against SQL injection.
 */
const getCategoryDetails = async (categoryId) => {
    const query = `
        SELECT
            category_id,
            name,
            description
        FROM public.project_categories
        WHERE category_id = $1;
    `;

    const queryParams = [categoryId];
    const result = await db.query(query, queryParams);

    // Return the first row of the result set, or null if no rows are found
    return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Retrieves all categories assigned to a given service project.
 *
 * Each project currently has one category (project.category_id), but the
 * function returns an array so views can render category tags the same
 * way whether a project has one category or several.
 */
const getCategoriesByProjectId = async (projectId) => {
    const query = `
        SELECT
            c.category_id,
            c.name,
            c.description
        FROM public.project_categories c
        JOIN public.project p ON p.category_id = c.category_id
        WHERE p.project_id = $1
        ORDER BY c.name;
    `;

    const queryParams = [projectId];
    const result = await db.query(query, queryParams);

    return result.rows;
};

// Export the model functions
export { getAllCategories, getCategoryDetails, getCategoriesByProjectId };
