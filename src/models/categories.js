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
        LEFT JOIN public.project_category pc ON pc.category_id = c.category_id
        LEFT JOIN public.project p ON p.project_id = pc.project_id
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
 * Assignments live in the many-to-many project_category table, so a
 * project can have none, one, or several categories.
 */
const getCategoriesByProjectId = async (projectId) => {
    const query = `
        SELECT
            c.category_id,
            c.name,
            c.description
        FROM public.project_categories c
        JOIN public.project_category pc ON pc.category_id = c.category_id
        WHERE pc.project_id = $1
        ORDER BY c.name;
    `;

    const queryParams = [projectId];
    const result = await db.query(query, queryParams);

    return result.rows;
};

/**
 * Assigns one category to a project by adding a row to the many-to-many
 * project_category table. Assigning the same pair twice is ignored.
 */
const assignCategoryToProject = async (projectId, categoryId) => {
    const query = `
        INSERT INTO public.project_category (project_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
    `;

    await db.query(query, [projectId, categoryId]);
};

/**
 * Replaces the categories assigned to a project with the given list.
 *
 * @param {string|number} projectId - The id of the project to update.
 * @param {Array<string|number>} categoryIds - The category ids the project should have.
 */
const updateCategoryAssignments = async (projectId, categoryIds) => {
    // First, remove existing category assignments for the project
    const deleteQuery = `
        DELETE FROM public.project_category
        WHERE project_id = $1;
    `;
    await db.query(deleteQuery, [projectId]);

    // Next, add the new category assignments
    for (const categoryId of categoryIds) {
        await assignCategoryToProject(projectId, categoryId);
    }
};

// Export the model functions
export { getAllCategories, getCategoryDetails, getCategoriesByProjectId, updateCategoryAssignments };
