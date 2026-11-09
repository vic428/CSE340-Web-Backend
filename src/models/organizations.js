import db from './db.js';

/**
 * Retrieves all partner organizations with the fields the organizations
 * page displays: name, description, contact email, and logo filename.
 *
 * Results are ordered alphabetically by name so the partner list renders
 * in a stable, predictable order regardless of insertion order.
 */
const getAllOrganizations = async () => {
    const query = `
        SELECT
            organization_id,
            name,
            description,
            contact_email,
            logo_filename
        FROM public.organization
        ORDER BY name;
    `;

    const result = await db.query(query);

    return result.rows;
};

export { getAllOrganizations };
