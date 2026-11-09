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
        FROM public.category c
        LEFT JOIN public.project p ON p.category_id = c.category_id
        GROUP BY c.category_id, c.name, c.description
        ORDER BY c.category_id;
    `;

    const result = await db.query(query);

    return result.rows;
};

export { getAllCategories };
