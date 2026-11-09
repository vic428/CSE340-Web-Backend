import db from './db.js';

/**
 * Retrieves all service projects along with the name, logo, and contact
 * email of the organization hosting each one.
 *
 * The project table stores only the organization_id, so a JOIN against the
 * organization table is needed to pull in the host's details.
 */
const getAllProjects = async () => {
    const query = `
        SELECT
            p.project_id,
            p.name,
            p.description,
            p.category,
            p.event_date,
            p.start_time,
            p.end_time,
            p.recurrence,
            p.location,
            p.volunteers_needed,
            o.organization_id,
            o.name AS organization_name,
            o.logo_filename,
            o.contact_email
        FROM public.project p
        JOIN public.organization o ON o.organization_id = p.organization_id
        ORDER BY p.event_date, p.start_time;
    `;

    const result = await db.query(query);

    return result.rows;
};

export { getAllProjects };
