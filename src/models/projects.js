import db from './db.js';

/**
 * Retrieves all service projects along with the name, logo, and contact
 * email of the organization hosting each one, and the category name.
 *
 * The project table stores only organization_id and category_id, so JOINs
 * against the organization and category tables pull in their details.
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
        JOIN public.category c ON c.category_id = p.category_id
        ORDER BY p.event_date, p.start_time;
    `;

    const result = await db.query(query);

    return result.rows;
};

export { getAllProjects };
